using Corvus.Api.Models;
using Corvus.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class AutoHealingAndWebhookTests
{
    private class AutoHealCountingHttpClient : DockerServiceTests.FakeDockerHttpClient
    {
        public int StartCallCount { get; private set; }
        public int RestartCallCount { get; private set; }

        public override Task<DockerActionResult> StartContainerAsync(string containerId, CancellationToken cancellationToken = default)
        {
            StartCallCount++;
            return Task.FromResult(new DockerActionResult(true, "Started"));
        }

        public override Task<DockerActionResult> RestartContainerAsync(string containerId, CancellationToken cancellationToken = default)
        {
            RestartCallCount++;
            return Task.FromResult(new DockerActionResult(true, "Restarted"));
        }
    }

    private class MockNotificationService : INotificationService
    {
        public int CrashAlertCount { get; private set; }
        public int AutoHealAlertCount { get; private set; }
        public bool LastAutoHealSuccess { get; private set; }

        public Task DispatchServiceAlertAsync(string serviceName, string? url, bool isDown, string? errorMessage, CancellationToken ct = default) => Task.CompletedTask;
        public Task DispatchSslExpiryAlertAsync(string serviceName, string? url, int daysRemaining, string? issuer, CancellationToken ct = default) => Task.CompletedTask;
        public Task DispatchFlappingAlertAsync(string serviceName, string? url, bool isRecovered, int transitionCount, CancellationToken ct = default) => Task.CompletedTask;

        public Task DispatchContainerCrashAlertAsync(string containerName, string containerId, int exitCode, string? errorReason, CancellationToken ct = default)
        {
            CrashAlertCount++;
            return Task.CompletedTask;
        }

        public Task DispatchContainerAutoHealedAlertAsync(string containerName, string containerId, int exitCode, bool success, string? detailMessage, CancellationToken ct = default)
        {
            AutoHealAlertCount++;
            LastAutoHealSuccess = success;
            return Task.CompletedTask;
        }

        public Task<NotificationResult> TestChannelAsync(string channel, string? webhookUrl, string? botToken, string? chatId, string? smtpHost = null, int? smtpPort = null, string? smtpUser = null, string? smtpPass = null, string? smtpFrom = null, string? smtpFromName = null, string? smtpTo = null, bool? smtpTls = null, CancellationToken ct = default) =>
            Task.FromResult(new NotificationResult(true, "OK"));
    }

    [Fact]
    public async Task TryAutoHealAsync_WhenExitCodeZero_DoesNothing()
    {
        var fakeHttp = new AutoHealCountingHttpClient();
        var dockerService = new DockerService(fakeHttp, NullLogger<DockerService>.Instance);
        var mockNotif = new MockNotificationService();
        var autoHeal = new AutoHealingService(dockerService, mockNotif, NullLogger<AutoHealingService>.Instance);

        var container = new DockerContainerInfo { Id = "c1", State = "exited" };
        bool healed = await autoHeal.TryAutoHealAsync(container, 0);

        Assert.False(healed);
        Assert.Equal(0, fakeHttp.StartCallCount);
        Assert.Equal(0, mockNotif.AutoHealAlertCount);
    }

    [Fact]
    public async Task TryAutoHealAsync_WhenExitCodeNonZero_RecoversContainer()
    {
        var fakeHttp = new AutoHealCountingHttpClient();
        var dockerService = new DockerService(fakeHttp, NullLogger<DockerService>.Instance);
        var mockNotif = new MockNotificationService();
        var autoHeal = new AutoHealingService(dockerService, mockNotif, NullLogger<AutoHealingService>.Instance);

        var container = new DockerContainerInfo { Id = "c1", State = "exited" };
        bool healed = await autoHeal.TryAutoHealAsync(container, 137);

        Assert.True(healed);
        Assert.Equal(1, fakeHttp.StartCallCount);
        Assert.Equal(1, mockNotif.AutoHealAlertCount);
        Assert.True(mockNotif.LastAutoHealSuccess);
    }

    [Fact]
    public async Task TryAutoHealAsync_WhenMaxRestartsExceeded_EnforcesCrashLoopProtection()
    {
        var fakeHttp = new AutoHealCountingHttpClient();
        var dockerService = new DockerService(fakeHttp, NullLogger<DockerService>.Instance);
        var mockNotif = new MockNotificationService();
        var autoHeal = new AutoHealingService(dockerService, mockNotif, NullLogger<AutoHealingService>.Instance);

        var container = new DockerContainerInfo { Id = "flapping_container", State = "exited" };

        // 1. Deneme -> Başarılı
        bool first = await autoHeal.TryAutoHealAsync(container, 1);
        Assert.True(first);

        // 2. Deneme -> Başarılı (Toplam 2 izin verilen limit)
        bool second = await autoHeal.TryAutoHealAsync(container, 1);
        Assert.True(second);

        // 3. Deneme -> Crash loop engeli devreye girer!
        bool third = await autoHeal.TryAutoHealAsync(container, 1);
        Assert.False(third);

        // Docker başlatma çağrısı 2'de durmalı (3. kez başlatılmamalı)
        Assert.Equal(2, fakeHttp.StartCallCount);
        Assert.False(mockNotif.LastAutoHealSuccess); // Son bildirim koruma uyarısı olmalı
    }

    [Fact]
    public async Task TryAutoHealAsync_WhenLabelDisabled_SkipsAutoHeal()
    {
        var fakeHttp = new AutoHealCountingHttpClient();
        var dockerService = new DockerService(fakeHttp, NullLogger<DockerService>.Instance);
        var mockNotif = new MockNotificationService();
        var autoHeal = new AutoHealingService(dockerService, mockNotif, NullLogger<AutoHealingService>.Instance);

        var container = new DockerContainerInfo 
        { 
            Id = "c1", 
            State = "exited",
            Labels = new Dictionary<string, string> { ["corvus.autoheal"] = "false" }
        };

        bool healed = await autoHeal.TryAutoHealAsync(container, 1);

        Assert.False(healed);
        Assert.Equal(0, fakeHttp.StartCallCount);
    }
}
