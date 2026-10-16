using System.Collections.Concurrent;

namespace Corvus.Api.Services.Deployments;

public interface IDeploymentLockManager
{
    bool TryAcquireLock(string containerId, out IDisposable releaser);
    bool IsLocked(string containerId);
}

public class DeploymentLockManager : IDeploymentLockManager
{
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new(StringComparer.OrdinalIgnoreCase);

    public bool TryAcquireLock(string containerId, out IDisposable releaser)
    {
        if (string.IsNullOrWhiteSpace(containerId))
        {
            releaser = NoopDisposable.Instance;
            return false;
        }

        var sem = _locks.GetOrAdd(containerId, _ => new SemaphoreSlim(1, 1));
        if (sem.Wait(0))
        {
            releaser = new Releaser(sem, () =>
            {
                // kilit serbest bırakıldığında
            });
            return true;
        }

        releaser = NoopDisposable.Instance;
        return false;
    }

    public bool IsLocked(string containerId)
    {
        if (string.IsNullOrWhiteSpace(containerId)) return false;
        if (_locks.TryGetValue(containerId, out var sem))
        {
            return sem.CurrentCount == 0;
        }
        return false;
    }

    private sealed class Releaser : IDisposable
    {
        private readonly SemaphoreSlim _semaphore;
        private readonly Action _onDispose;
        private int _disposed;

        public Releaser(SemaphoreSlim semaphore, Action onDispose)
        {
            _semaphore = semaphore;
            _onDispose = onDispose;
        }

        public void Dispose()
        {
            if (Interlocked.Exchange(ref _disposed, 1) == 0)
            {
                _semaphore.Release();
                _onDispose();
            }
        }
    }

    private sealed class NoopDisposable : IDisposable
    {
        public static readonly NoopDisposable Instance = new();
        public void Dispose() { }
    }
}
