using Corvus.Api.Data;
using Corvus.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class AlertRuleRepositoryTests
{
    private class TempDbScope : IDisposable
    {
        public string TempDir { get; }
        public IDbConnectionFactory DbFactory { get; }

        public TempDbScope()
        {
            TempDir = Path.Combine(Path.GetTempPath(), "corvus_alert_test_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(TempDir);

            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Database:DataDir"] = TempDir
                })
                .Build();

            DbFactory = new DbConnectionFactory(config);
            DatabaseMigrator.Migrate(DbFactory, NullLogger.Instance);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(TempDir))
                {
                    Directory.Delete(TempDir, true);
                }
            }
            catch { }
        }
    }

    [Fact]
    public async Task AlertRuleRepository_Crud_WorksCorrectly()
    {
        using var scope = new TempDbScope();
        var repo = new AlertRuleRepository(scope.DbFactory);

        var ruleId = Guid.NewGuid().ToString();
        var rule = new AlertRule
        {
            Id = ruleId,
            Name = "Yüksek CPU Alarmı",
            TargetType = "system",
            Metric = "cpu",
            Operator = "gt",
            ThresholdValue = 85.0,
            DurationSeconds = 120,
            CooldownMinutes = 15,
            IsEnabled = true,
            IsFiring = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // 1. Oluştur
        await repo.CreateRuleAsync(rule);

        // 2. Oku
        var fetched = await repo.GetRuleByIdAsync(ruleId);
        Assert.NotNull(fetched);
        Assert.Equal("Yüksek CPU Alarmı", fetched.Name);
        Assert.Equal(85.0, fetched.ThresholdValue);
        Assert.Equal("cpu", fetched.Metric);
        Assert.True(fetched.IsEnabled);
        Assert.False(fetched.IsFiring);

        // 3. Durum Güncelle
        var now = DateTime.UtcNow;
        await repo.UpdateRuleStateAsync(ruleId, isFiring: true, violationStartAt: now, lastTriggeredAt: now);
        var updatedState = await repo.GetRuleByIdAsync(ruleId);
        Assert.NotNull(updatedState);
        Assert.True(updatedState.IsFiring);
        Assert.NotNull(updatedState.ViolationStartAt);
        Assert.NotNull(updatedState.LastTriggeredAt);

        // 4. Kural Güncelle
        updatedState.Name = "Güncellenmiş CPU Alarmı";
        updatedState.ThresholdValue = 90.0;
        await repo.UpdateRuleAsync(updatedState);

        var afterUpdate = await repo.GetRuleByIdAsync(ruleId);
        Assert.NotNull(afterUpdate);
        Assert.Equal("Güncellenmiş CPU Alarmı", afterUpdate.Name);
        Assert.Equal(90.0, afterUpdate.ThresholdValue);

        // 5. Sil
        await repo.DeleteRuleAsync(ruleId);
        var afterDelete = await repo.GetRuleByIdAsync(ruleId);
        Assert.Null(afterDelete);
    }

    [Fact]
    public async Task AlertRuleRepository_GetEnabledRules_FiltersCorrectly()
    {
        using var scope = new TempDbScope();
        var repo = new AlertRuleRepository(scope.DbFactory);

        var rule1 = new AlertRule
        {
            Id = Guid.NewGuid().ToString(),
            Name = "Aktif Kural",
            TargetType = "system",
            Metric = "memory",
            Operator = "gt",
            ThresholdValue = 80.0,
            IsEnabled = true
        };

        var rule2 = new AlertRule
        {
            Id = Guid.NewGuid().ToString(),
            Name = "Devre Dışı Kural",
            TargetType = "system",
            Metric = "disk",
            Operator = "gt",
            ThresholdValue = 95.0,
            IsEnabled = false
        };

        await repo.CreateRuleAsync(rule1);
        await repo.CreateRuleAsync(rule2);

        var enabledRules = (await repo.GetEnabledRulesAsync()).ToList();
        Assert.Single(enabledRules);
        Assert.Equal("Aktif Kural", enabledRules[0].Name);
    }
}
