using Corvus.Api.Models;
using Xunit;

namespace Corvus.Api.Tests;

public class TestConnectionDefaultsTests
{
    [Fact]
    public void TestConnectionRequest_IgnoreTls_DefaultsToFalse()
    {
        var req = new TestConnectionRequest();
        Assert.False(req.IgnoreTls ?? false);
        Assert.False(req.IgnoreTls.GetValueOrDefault(true));
    }
}
