using System.Net.WebSockets;
using Corvus.Api.Models.Systems;
using Corvus.Api.Services.Systems;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class TunnelAndSecurityTests
{
    private sealed class BlockingWebSocket : WebSocket
    {
        private readonly WebSocketState _state = WebSocketState.Open;

        public override WebSocketCloseStatus? CloseStatus => null;
        public override string? CloseStatusDescription => null;
        public override WebSocketState State => _state;
        public override string? SubProtocol => null;

        public override void Abort() { }
        public override Task CloseAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken)
            => Task.CompletedTask;
        public override Task CloseOutputAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken)
            => Task.CompletedTask;
        public override void Dispose() { }

        public override Task<WebSocketReceiveResult> ReceiveAsync(ArraySegment<byte> buffer, CancellationToken cancellationToken)
            => Task.Delay(Timeout.Infinite, cancellationToken).ContinueWith(_ => new WebSocketReceiveResult(0, WebSocketMessageType.Close, true), cancellationToken);

        public override async Task SendAsync(ArraySegment<byte> buffer, WebSocketMessageType messageType, bool endOfMessage, CancellationToken cancellationToken)
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
        }
    }

    [Fact]
    public async Task SendDockerRequestAsync_TimesOutCleanly_WhenSocketSendBlocks()
    {
        var manager = new SystemTunnelManager(NullLogger<SystemTunnelManager>.Instance);
        using var blockingSocket = new BlockingWebSocket();
        manager.RegisterTunnel("sys-blocking", blockingSocket);

        var resp = await manager.SendDockerRequestAsync(
            "sys-blocking",
            new DockerRpcRequest(Action: "restart", ContainerId: "c1"),
            TimeSpan.FromMilliseconds(150));

        Assert.False(resp.Success);
        Assert.Contains("timed out", resp.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SendDockerRequestAsync_NonPositiveTimeout_FallsBackGracefully()
    {
        var manager = new SystemTunnelManager(NullLogger<SystemTunnelManager>.Instance);
        var resp = await manager.SendDockerRequestAsync(
            "sys-offline",
            new DockerRpcRequest(Action: "restart", ContainerId: "c1"),
            TimeSpan.Zero);

        Assert.False(resp.Success);
        Assert.Contains("offline", resp.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SendRawBinaryAsync_DoesNotDeadlock_WhenSocketSendBlocks()
    {
        var manager = new SystemTunnelManager(NullLogger<SystemTunnelManager>.Instance);
        using var blockingSocket = new BlockingWebSocket();
        manager.RegisterTunnel("sys-bin-blocking", blockingSocket);

        var sendTask = manager.SendRawBinaryAsync("sys-bin-blocking", new byte[] { 0x01, 0x02 });
        var completed = await Task.WhenAny(sendTask, Task.Delay(TimeSpan.FromSeconds(15)));

        Assert.Same(sendTask, completed);
        await sendTask;
    }
}
