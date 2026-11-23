using Corvus.Api.Data;
using Corvus.Api.Endpoints;
using Corvus.Api.Models;
using Corvus.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

/// <summary>
/// /api/push/{token} davranışı: "failure" push'u Dead Man's Snitch monitörünü
/// sağlıklı göstermemeli, monitörü hemen down yapmalı ve alarm üretmelidir.
/// </summary>
public class PushEndpointsTests : IDisposable
{
    private const string Token = "restic_push_token";

    private readonly string _tempDbDir;
    private readonly IDbConnectionFactory _dbFactory;
    private readonly PushMonitorRepository _pushRepo;
    private readonly BackupRepository _backupRepo;
    private readonly SettingsRepository _settingsRepo;
    private readonly RecordingNotificationService _notifications = new();
    private readonly EventBroadcaster _broadcaster = new();

    public PushEndpointsTests()
    {
        _tempDbDir = Path.Combine(Path.GetTempPath(), "corvus_push_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempDbDir);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Database:DataDir"] = _tempDbDir })
            .Build();

        _dbFactory = new DbConnectionFactory(config);
        DatabaseMigrator.Migrate(_dbFactory, NullLogger.Instance);
        _pushRepo = new PushMonitorRepository(_dbFactory);
        _backupRepo = new BackupRepository(_dbFactory);
        _settingsRepo = new SettingsRepository(_dbFactory);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_tempDbDir)) Directory.Delete(_tempDbDir, true);
        }
        catch
        {
            // Temizlik hataları testi bozmaz
        }
    }

    private async Task<PushMonitor> CreateMonitorAsync(string status = "unknown")
    {
        var monitor = new PushMonitor
        {
            Id = Guid.NewGuid().ToString("N"),
            Token = Token,
            Name = "restic yedek",
            ExpectedIntervalMinutes = 1440,
            GracePeriodMinutes = 120,
            Status = status,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };
        await _pushRepo.CreateAsync(monitor);
        return monitor;
    }

    private Task PushAsync(string? status, string? message = null) =>
        PushEndpoints.HandlePushAsync(
            Token, status, sizeBytes: null, message,
            _backupRepo, _pushRepo, _settingsRepo, _notifications, _broadcaster);

    [Fact]
    public async Task Failure_push_marks_monitor_down_instead_of_healthy()
    {
        await CreateMonitorAsync();

        await PushAsync("failure", "restic: repository locked");

        var monitor = await _pushRepo.GetByTokenAsync(Token);
        Assert.Equal("down", monitor!.Status);
    }

    [Fact]
    public async Task Failure_push_dispatches_down_alert_through_service_alert_channel()
    {
        await CreateMonitorAsync();

        await PushAsync("failure", "restic: repository locked");

        var alert = Assert.Single(_notifications.ServiceAlerts);
        Assert.True(alert.IsDown);
        Assert.Contains("restic yedek", alert.ServiceName);
        Assert.Contains("restic: repository locked", alert.ErrorMessage);
    }

    [Fact]
    public async Task Failure_push_does_not_reset_snitch_timer()
    {
        await CreateMonitorAsync();

        await PushAsync("failure");

        var monitor = await _pushRepo.GetByTokenAsync(Token);
        Assert.Null(monitor!.LastSeenAt);
    }

    [Theory]
    [InlineData("down")]
    [InlineData("DOWN")]
    [InlineData("Failure")]
    public async Task Down_status_variants_are_treated_as_failure(string status)
    {
        await CreateMonitorAsync();

        await PushAsync(status);

        var monitor = await _pushRepo.GetByTokenAsync(Token);
        Assert.Equal("down", monitor!.Status);
        var evt = await _backupRepo.GetLatestAsync();
        Assert.Equal("failure", evt!.Status);
    }

    [Fact]
    public async Task Repeated_failure_push_alerts_only_on_transition_to_down()
    {
        await CreateMonitorAsync();

        await PushAsync("failure");
        await PushAsync("failure");

        Assert.Single(_notifications.ServiceAlerts);
    }

    [Fact]
    public async Task Failure_push_is_recorded_as_failure_backup_event()
    {
        await CreateMonitorAsync();

        await PushAsync("failure", "disk full");

        var evt = await _backupRepo.GetLatestAsync();
        Assert.Equal("failure", evt!.Status);
        Assert.Equal("disk full", evt.Message);
    }

    [Fact]
    public async Task Success_push_after_failure_marks_monitor_healthy_without_alert()
    {
        await CreateMonitorAsync();
        await PushAsync("failure");
        _notifications.ServiceAlerts.Clear();

        await PushAsync("success");

        var monitor = await _pushRepo.GetByTokenAsync(Token);
        Assert.Equal("healthy", monitor!.Status);
        Assert.NotNull(monitor.LastSeenAt);
        Assert.Empty(_notifications.ServiceAlerts);
        var evt = await _backupRepo.GetLatestAsync();
        Assert.Equal("success", evt!.Status);
    }

    private sealed class RecordingNotificationService : INotificationService
    {
        public record ServiceAlert(string ServiceName, string? Url, bool IsDown, string? ErrorMessage);

        public List<ServiceAlert> ServiceAlerts { get; } = new();

        public Task DispatchServiceAlertAsync(string serviceName, string? url, bool isDown, string? errorMessage, CancellationToken ct = default)
        {
            ServiceAlerts.Add(new ServiceAlert(serviceName, url, isDown, errorMessage));
            return Task.CompletedTask;
        }

        public Task DispatchSslExpiryAlertAsync(string serviceName, string? url, int daysRemaining, string? issuer, CancellationToken ct = default) => Task.CompletedTask;
        public Task DispatchFlappingAlertAsync(string serviceName, string? url, bool isRecovered, int transitionCount, CancellationToken ct = default) => Task.CompletedTask;
        public Task DispatchContainerCrashAlertAsync(string containerName, string containerId, int exitCode, string? errorReason, CancellationToken ct = default) => Task.CompletedTask;
        public Task DispatchContainerAutoHealedAlertAsync(string containerName, string containerId, int exitCode, bool success, string? detailMessage, CancellationToken ct = default) => Task.CompletedTask;
        public Task DispatchMetricThresholdAlertAsync(string ruleName, string targetDescription, string metric, double thresholdValue, double currentValue, bool isResolved, CancellationToken ct = default) => Task.CompletedTask;

        public Task<NotificationResult> TestChannelAsync(string channel, string? webhookUrl, string? botToken, string? chatId, string? smtpHost = null, int? smtpPort = null, string? smtpUser = null, string? smtpPass = null, string? smtpFrom = null, string? smtpFromName = null, string? smtpTo = null, bool? smtpTls = null, CancellationToken ct = default) =>
            Task.FromResult(new NotificationResult(true, "OK"));
    }
}
