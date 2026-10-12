using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Corvus.Api.Models;
using Corvus.Api.Models.Systems;

namespace Corvus.Api.Services.Systems;

public interface ISystemTunnelManager
{
    void RegisterTunnel(string systemId, WebSocket socket);
    void UnregisterTunnel(string systemId, WebSocket socket);
    bool IsConnected(string systemId);
    Task<DockerRpcResponse> SendDockerRequestAsync(string systemId, DockerRpcRequest request, TimeSpan? timeout = null);
    void HandleRpcResponse(string correlationId, DockerRpcResponse response);
    Task SendRawBinaryAsync(string systemId, ReadOnlyMemory<byte> binaryPayload);
    WebSocket? GetActiveSocket(string systemId);
}

public class SystemTunnelManager : ISystemTunnelManager
{
    private readonly ConcurrentDictionary<string, WebSocket> _sockets = new();
    private readonly ConcurrentDictionary<string, TaskCompletionSource<DockerRpcResponse>> _pendingRpc = new();
    private readonly ILogger<SystemTunnelManager> _logger;

    public SystemTunnelManager(ILogger<SystemTunnelManager> logger)
    {
        _logger = logger;
    }

    public void RegisterTunnel(string systemId, WebSocket socket)
    {
        _sockets.AddOrUpdate(systemId, socket, (_, old) =>
        {
            if (old != socket && old.State == WebSocketState.Open)
            {
                try { old.Abort(); } catch { }
            }
            return socket;
        });
        _logger.LogInformation("System tunnel registered for system: {SystemId}", systemId);
    }

    public void UnregisterTunnel(string systemId, WebSocket socket)
    {
        if (_sockets.TryGetValue(systemId, out var current) && current == socket)
        {
            _sockets.TryRemove(systemId, out _);
            _logger.LogInformation("System tunnel unregistered for system: {SystemId}", systemId);
        }
    }

    public bool IsConnected(string systemId)
    {
        return _sockets.TryGetValue(systemId, out var socket) && socket.State == WebSocketState.Open;
    }

    public WebSocket? GetActiveSocket(string systemId)
    {
        if (_sockets.TryGetValue(systemId, out var socket) && socket.State == WebSocketState.Open)
        {
            return socket;
        }
        return null;
    }

    public async Task<DockerRpcResponse> SendDockerRequestAsync(string systemId, DockerRpcRequest request, TimeSpan? timeout = null)
    {
        if (!IsConnected(systemId) || !_sockets.TryGetValue(systemId, out var socket))
        {
            return new DockerRpcResponse(Success: false, Message: "System is offline or tunnel is closed.");
        }

        string correlationId = Guid.NewGuid().ToString("N");
        var tcs = new TaskCompletionSource<DockerRpcResponse>(TaskCreationOptions.RunContinuationsAsynchronously);
        _pendingRpc[correlationId] = tcs;

        var message = new AgentTunnelMessage(
            Type: "docker_req",
            CorrelationId: correlationId,
            Telemetry: null,
            DockerReq: request,
            DockerRes: null,
            Error: null
        );

        byte[] jsonBytes = JsonSerializer.SerializeToUtf8Bytes(message, CorvusJsonSerializerContext.Default.AgentTunnelMessage);

        try
        {
            await socket.SendAsync(new ArraySegment<byte>(jsonBytes), WebSocketMessageType.Text, true, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _pendingRpc.TryRemove(correlationId, out _);
            return new DockerRpcResponse(Success: false, Message: $"Failed to send command to tunnel: {ex.Message}");
        }

        var effectiveTimeout = timeout ?? TimeSpan.FromSeconds(15);
        using var cts = new CancellationTokenSource(effectiveTimeout);

        try
        {
            return await tcs.Task.WaitAsync(cts.Token);
        }
        catch (OperationCanceledException)
        {
            _pendingRpc.TryRemove(correlationId, out _);
            return new DockerRpcResponse(Success: false, Message: $"Command timed out after {effectiveTimeout.TotalSeconds}s.");
        }
    }

    public void HandleRpcResponse(string correlationId, DockerRpcResponse response)
    {
        if (_pendingRpc.TryRemove(correlationId, out var tcs))
        {
            tcs.TrySetResult(response);
        }
    }

    public async Task SendRawBinaryAsync(string systemId, ReadOnlyMemory<byte> binaryPayload)
    {
        if (_sockets.TryGetValue(systemId, out var socket) && socket.State == WebSocketState.Open)
        {
            await socket.SendAsync(binaryPayload, WebSocketMessageType.Binary, true, CancellationToken.None);
        }
    }
}
