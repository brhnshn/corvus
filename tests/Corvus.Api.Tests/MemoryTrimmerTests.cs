using Corvus.Api.BackgroundServices;
using Corvus.Api.Utils;
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
}
