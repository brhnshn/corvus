using Corvus.Api.Services.Deployments;
using Xunit;

namespace Corvus.Api.Tests;

public class DeploymentLockManagerTests
{
    [Fact]
    public void TryAcquireLock_SingleCaller_Succeeds()
    {
        var manager = new DeploymentLockManager();
        string containerId = "container_abc";

        bool acquired = manager.TryAcquireLock(containerId, out var releaser);
        Assert.True(acquired);
        Assert.NotNull(releaser);
        Assert.True(manager.IsLocked(containerId));

        releaser.Dispose();
        Assert.False(manager.IsLocked(containerId));
    }

    [Fact]
    public void TryAcquireLock_ConcurrentCaller_ReturnsFalse_FailFast()
    {
        var manager = new DeploymentLockManager();
        string containerId = "container_race";

        bool first = manager.TryAcquireLock(containerId, out var releaser1);
        Assert.True(first);

        // İkinci çağrı aynı container için hemen false dönmeli (fail-fast 409)
        bool second = manager.TryAcquireLock(containerId, out var releaser2);
        Assert.False(second);
        Assert.NotNull(releaser2);

        // İlk kilit bırakılınca yeniden alınabilmeli
        releaser1.Dispose();

        bool third = manager.TryAcquireLock(containerId, out var releaser3);
        Assert.True(third);
        releaser3.Dispose();
    }

    [Fact]
    public void TryAcquireLock_DifferentContainers_DoNotBlockEachOther()
    {
        var manager = new DeploymentLockManager();

        bool c1 = manager.TryAcquireLock("container_1", out var r1);
        bool c2 = manager.TryAcquireLock("container_2", out var r2);

        Assert.True(c1);
        Assert.True(c2);

        r1.Dispose();
        r2.Dispose();
    }
}
