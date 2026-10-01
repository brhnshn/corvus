using Corvus.Api.BackgroundServices;
using Corvus.Api.Utils;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class MemoryTrimmerTests
{
    [Fact]
    public void NativeMemoryTrimmer_Trim_DoesNotThrow()
    {
        var exception = Record.Exception(() => NativeMemoryTrimmer.Trim());
        Assert.Null(exception);
    }

    [Fact]
    public async Task MemoryTrimmerBackgroundService_StopsGracefully_OnCancellation()
    {
        var service = new MemoryTrimmerBackgroundService(NullLogger<MemoryTrimmerBackgroundService>.Instance);
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        var exception = await Record.ExceptionAsync(() => service.StartAsync(cts.Token));
        Assert.Null(exception);
    }

    [Fact]
    public async Task MemoryTrimmerBackgroundService_WithDbFactory_Executes_WithoutThrowing()
    {
        string tempDir = Path.Combine(Path.GetTempPath(), "corvus_trim_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);
        try
        {
            var config = new Microsoft.Extensions.Configuration.ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Database:DataDir"] = tempDir
                })
                .Build();

            var dbFactory = new Corvus.Api.Data.DbConnectionFactory(config);
            Corvus.Api.Data.DatabaseMigrator.Migrate(dbFactory, NullLogger.Instance);

            var service = new MemoryTrimmerBackgroundService(NullLogger<MemoryTrimmerBackgroundService>.Instance, dbFactory);
            using var cts = new CancellationTokenSource();
            cts.Cancel();

            var exception = await Record.ExceptionAsync(() => service.StartAsync(cts.Token));
            Assert.Null(exception);
        }
        finally
        {
            try
            {
                if (Directory.Exists(tempDir))
                {
                    Directory.Delete(tempDir, true);
                }
            }
            catch { }
        }
    }
}
