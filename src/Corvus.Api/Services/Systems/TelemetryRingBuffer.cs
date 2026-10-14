using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Threading.Channels;
using Corvus.Api.Models.Systems;

namespace Corvus.Api.Services.Systems;

public interface ITelemetryRingBuffer
{
    event Action<string, SystemTelemetryPoint>? OnPointPushed;
    void Push(string systemId, in SystemTelemetryPoint point, IReadOnlyList<SystemContainerCacheEntity>? containers = null);
    bool TryGetLatest(string systemId, out SystemTelemetryPoint point);
    IReadOnlyList<SystemTelemetryPoint> GetRecentPoints(string systemId, int count = 60);
    IReadOnlyList<SystemContainerCacheEntity> GetCachedContainers(string systemId);
    IReadOnlyList<string> GetActiveSystemIds();
    long EstimateMemoryBytes();
    void RemoveSystem(string systemId);
    IReadOnlyDictionary<string, SystemTelemetryPoint[]> DrainForBatchFlush();
    IAsyncEnumerable<SystemTelemetryPoint> StreamAsync(string systemId, CancellationToken cancellationToken);
}

/// <summary>
/// Sistem basina 60 elemanlik (3 dk @ 3s) dairesel bellek tamponu.
/// Kilit (lock-free / fine-grained lock) mekanizmasiyla CPU ve RAM dostudur.
/// </summary>
public class TelemetryRingBuffer : ITelemetryRingBuffer
{
    public event Action<string, SystemTelemetryPoint>? OnPointPushed;
    private const int BufferCapacity = 60;

    private sealed class NodeBuffer
    {
        private readonly SystemTelemetryPoint[] _points = new SystemTelemetryPoint[BufferCapacity];
        private int _head = 0;
        private int _count = 0;
        private readonly object _sync = new();
        private SystemContainerCacheEntity[] _containers = Array.Empty<SystemContainerCacheEntity>();

        public void Push(in SystemTelemetryPoint point, IReadOnlyList<SystemContainerCacheEntity>? containers)
        {
            lock (_sync)
            {
                _points[_head] = point;
                _head = (_head + 1) % BufferCapacity;
                if (_count < BufferCapacity)
                {
                    _count++;
                }

                if (containers != null)
                {
                    var arr = new SystemContainerCacheEntity[containers.Count];
                    for (int i = 0; i < containers.Count; i++)
                    {
                        arr[i] = containers[i];
                    }
                    _containers = arr;
                }
            }
        }

        public bool TryGetLatest(out SystemTelemetryPoint point)
        {
            lock (_sync)
            {
                if (_count == 0)
                {
                    point = default;
                    return false;
                }
                int latestIdx = (_head - 1 + BufferCapacity) % BufferCapacity;
                point = _points[latestIdx];
                return true;
            }
        }

        public SystemTelemetryPoint[] GetRecentPoints(int maxCount)
        {
            lock (_sync)
            {
                int toReturn = Math.Min(_count, maxCount);
                var result = new SystemTelemetryPoint[toReturn];
                for (int i = 0; i < toReturn; i++)
                {
                    int idx = (_head - 1 - i + BufferCapacity * 2) % BufferCapacity;
                    result[toReturn - 1 - i] = _points[idx];
                }
                return result;
            }
        }

        public IReadOnlyList<SystemContainerCacheEntity> GetContainers()
        {
            lock (_sync)
            {
                return _containers;
            }
        }

        public SystemTelemetryPoint[] SnapshotAll()
        {
            lock (_sync)
            {
                if (_count == 0) return Array.Empty<SystemTelemetryPoint>();
                var arr = new SystemTelemetryPoint[_count];
                for (int i = 0; i < _count; i++)
                {
                    int idx = (_head - _count + i + BufferCapacity) % BufferCapacity;
                    arr[i] = _points[idx];
                }
                return arr;
            }
        }
    }

    private readonly ConcurrentDictionary<string, NodeBuffer> _buffers = new();

    public void Push(string systemId, in SystemTelemetryPoint point, IReadOnlyList<SystemContainerCacheEntity>? containers = null)
    {
        var buffer = _buffers.GetOrAdd(systemId, _ => new NodeBuffer());
        buffer.Push(in point, containers);
        OnPointPushed?.Invoke(systemId, point);
    }

    public bool TryGetLatest(string systemId, out SystemTelemetryPoint point)
    {
        if (_buffers.TryGetValue(systemId, out var buffer))
        {
            return buffer.TryGetLatest(out point);
        }
        point = default;
        return false;
    }

    public IReadOnlyList<SystemTelemetryPoint> GetRecentPoints(string systemId, int count = 60)
    {
        if (_buffers.TryGetValue(systemId, out var buffer))
        {
            return buffer.GetRecentPoints(count);
        }
        return Array.Empty<SystemTelemetryPoint>();
    }

    public IReadOnlyList<SystemContainerCacheEntity> GetCachedContainers(string systemId)
    {
        if (_buffers.TryGetValue(systemId, out var buffer))
        {
            return buffer.GetContainers();
        }
        return Array.Empty<SystemContainerCacheEntity>();
    }

    public IReadOnlyList<string> GetActiveSystemIds()
    {
        return _buffers.Keys.ToArray();
    }

    public long EstimateMemoryBytes()
    {
        // 1 NodeBuffer struct array: 60 * 128 = 7680 bytes + overhead ~8 KB
        return _buffers.Count * 8192L;
    }

    public void RemoveSystem(string systemId)
    {
        _buffers.TryRemove(systemId, out _);
    }

    public IReadOnlyDictionary<string, SystemTelemetryPoint[]> DrainForBatchFlush()
    {
        var result = new Dictionary<string, SystemTelemetryPoint[]>(_buffers.Count);
        foreach (var kvp in _buffers)
        {
            var points = kvp.Value.SnapshotAll();
            if (points.Length > 0)
            {
                result[kvp.Key] = points;
            }
        }
        return result;
    }

    public async IAsyncEnumerable<SystemTelemetryPoint> StreamAsync(string systemId, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var channel = Channel.CreateBounded<SystemTelemetryPoint>(new BoundedChannelOptions(50)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleWriter = false,
            SingleReader = true
        });

        // Varsa ilk olarak en son noktayı hemen gönder (100ms sync)
        if (TryGetLatest(systemId, out var latest))
        {
            channel.Writer.TryWrite(latest);
        }

        void Handler(string id, SystemTelemetryPoint pt)
        {
            if (string.Equals(id, systemId, StringComparison.OrdinalIgnoreCase))
            {
                channel.Writer.TryWrite(pt);
            }
        }

        OnPointPushed += Handler;
        try
        {
            await foreach (var pt in channel.Reader.ReadAllAsync(cancellationToken))
            {
                yield return pt;
            }
        }
        finally
        {
            OnPointPushed -= Handler;
            channel.Writer.TryComplete();
        }
    }
}
