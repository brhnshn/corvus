using Corvus.Api.Services.Systems;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class SystemdServiceClientTests
{
    private readonly SystemdServiceClient _service;

    public SystemdServiceClientTests()
    {
        _service = new SystemdServiceClient(NullLogger<SystemdServiceClient>.Instance);
    }

    [Theory]
    [InlineData("nginx.service", true)]
    [InlineData("corvus.service", true)]
    [InlineData("docker@1.service", true)]
    [InlineData("my_app-worker.service", true)]
    [InlineData("systemd-resolved.service", true)]
    [InlineData("corvus_agent.v2.service", true)]
    [InlineData("", false)]
    [InlineData("   ", false)]
    [InlineData(null, false)]
    [InlineData("nginx", false)]
    [InlineData("nginx.target", false)]
    [InlineData("nginx.socket", false)]
    [InlineData("nginx.service; rm -rf /", false)]
    [InlineData("nginx.service && cat /etc/passwd", false)]
    [InlineData("../nginx.service", false)]
    [InlineData("nginx.service|sh", false)]
    [InlineData("nginx service.service", false)]
    [InlineData("$(whoami).service", false)]
    [InlineData("`whoami`.service", false)]
    public void IsValidUnitName_ValidatesCorrectly(string? unitName, bool expectedValid)
    {
        bool actual = SystemdServiceClient.IsValidUnitName(unitName);
        Assert.Equal(expectedValid, actual);
    }

    [Theory]
    [InlineData("kill")]
    [InlineData("mask")]
    [InlineData("cat")]
    [InlineData("status; rm")]
    public async Task ControlUnitAsync_RejectsInvalidAction(string action)
    {
        var result = await _service.ControlUnitAsync("nginx.service", action);

        Assert.False(result.Success);
        Assert.Contains("Geçersiz eylem", result.Message);
    }

    [Fact]
    public async Task ControlUnitAsync_RejectsMaliciousUnitName()
    {
        var result = await _service.ControlUnitAsync("nginx.service; reboot", "restart");

        Assert.False(result.Success);
        Assert.Contains("Geçersiz birim adı", result.Message);
    }

    [Fact]
    public async Task GetUnitLogsAsync_RejectsMaliciousUnitName()
    {
        var result = await _service.GetUnitLogsAsync("nginx.service; cat /etc/shadow");

        Assert.NotEmpty(result.Logs);
        Assert.Contains("Geçersiz birim adı", result.Logs[0]);
    }

    [Fact]
    public async Task NonLinux_GracefulHandling()
    {
        if (OperatingSystem.IsLinux()) return;

        var list = await _service.ListUnitsAsync();
        Assert.Empty(list);

        var actionResult = await _service.ControlUnitAsync("nginx.service", "restart");
        Assert.False(actionResult.Success);
        Assert.Contains("yalnızca Linux", actionResult.Message);

        var logsResult = await _service.GetUnitLogsAsync("nginx.service");
        Assert.NotEmpty(logsResult.Logs);
        Assert.Contains("yalnızca Linux", logsResult.Logs[0]);
    }
}
