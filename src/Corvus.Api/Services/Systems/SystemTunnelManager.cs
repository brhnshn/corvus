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

public sealed class TunnelConnection
{
    public WebSocket Socket { get; }
    public SemaphoreSlim SendLock { get; } = new(1, 1);

    public TunnelConnection(WebSocket socket)
    {
        Socket = socket;
    }
}

public class SystemTunnelManager : ISystemTunnelManager
{
    private static readonly TimeSpan DefaultRpcTimeout = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan DefaultSendTimeout = TimeSpan.FromSeconds(10);

    private readonly ConcurrentDictionary<string, TunnelConnection> _connections = new();
    private readonly ConcurrentDictionary<string, TaskCompletionSource<DockerRpcResponse>> _pendingRpc = new();
    private readonly ILogger<SystemTunnelManager> _logger;

    public SystemTunnelManager(ILogger<SystemTunnelManager> logger)
    {
        _logger = logger;
    }

    public void RegisterTunnel(string systemId, WebSocket socket)
    {
        var newConn = new TunnelConnection(socket);
        _connections.AddOrUpdate(systemId, newConn, (_, old) =>
        {
            if (old.Socket != socket && old.Socket.State == WebSocketState.Open)
            {
                try { old.Socket.Abort(); } catch { }
            }
            return newConn;
        });
        _logger.LogInformation("System tunnel registered for system: {SystemId}", 
            Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(systemId));
    }

    public void UnregisterTunnel(string systemId, WebSocket socket)
    {
        if (_connections.TryGetValue(systemId, out var current) && current.Socket == socket)
        {
            _connections.TryRemove(systemId, out _);
            _logger.LogInformation("System tunnel unregistered for system: {SystemId}", 
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(systemId));
        }
    }

    public bool IsConnected(string systemId)
    {
        return _connections.TryGetValue(systemId, out var conn) && conn.Socket.State == WebSocketState.Open;
    }

    public WebSocket? GetActiveSocket(string systemId)
    {
        if (_connections.TryGetValue(systemId, out var conn) && conn.Socket.State == WebSocketState.Open)
        {
            return conn.Socket;
        }
        return null;
    }

    public async Task<DockerRpcResponse> SendDockerRequestAsync(string systemId, DockerRpcRequest request, TimeSpan? timeout = null)
    {
        if (!IsConnected(systemId) || !_connections.TryGetValue(systemId, out var conn))
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

        var effectiveTimeout = timeout is { TotalMilliseconds: > 0 } validTimeout ? validTimeout : DefaultRpcTimeout;
        var sendTimeout = effectiveTimeout < DefaultSendTimeout ? effectiveTimeout : DefaultSendTimeout;

        try
        {
            using var sendCts = new CancellationTokenSource(sendTimeout);
            await conn.SendLock.WaitAsync(sendCts.Token);
            try
            {
                if (conn.Socket.State == WebSocketState.Open)
                {
                    await conn.Socket.SendAsync(new ArraySegment<byte>(jsonBytes), WebSocketMessageType.Text, true, sendCts.Token);
                }
                else
                {
                    _pendingRpc.TryRemove(correlationId, out _);
                    return new DockerRpcResponse(Success: false, Message: "Tunnel socket is not open.");
                }
            }
            finally
            {
                conn.SendLock.Release();
            }
        }
        catch (OperationCanceledException)
        {
            _pendingRpc.TryRemove(correlationId, out _);
            return new DockerRpcResponse(Success: false, Message: $"Tunnel send timed out after {sendTimeout.TotalSeconds:0.#}s.");
        }
        catch (Exception ex)
        {
            _pendingRpc.TryRemove(correlationId, out _);
            _logger.LogWarning(ex, "Failed to send Docker RPC command to tunnel for system: {SystemId}",
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(systemId));
            return new DockerRpcResponse(Success: false, Message: "Failed to send command to tunnel.");
        }

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
        if (_connections.TryGetValue(systemId, out var conn) && conn.Socket.State == WebSocketState.Open)
        {
            using var sendCts = new CancellationTokenSource(DefaultSendTimeout);
            try
            {
                await conn.SendLock.WaitAsync(sendCts.Token);
                try
                {
                    if (conn.Socket.State == WebSocketState.Open)
                    {
                        await conn.Socket.SendAsync(binaryPayload, WebSocketMessageType.Binary, true, sendCts.Token);
                    }
                }
                finally
                {
                    conn.SendLock.Release();
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Binary tunnel send timed out for system: {SystemId}",
                    Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(systemId));
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Binary tunnel send failed for system: {SystemId}",
                    Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(systemId));
            }
        }
    }
}
