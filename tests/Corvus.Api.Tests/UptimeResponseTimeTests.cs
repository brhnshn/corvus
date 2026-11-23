using System.Net;
using Corvus.Api.Models;
using Corvus.Api.Services.Uptime.Checkers;
using Xunit;

namespace Corvus.Api.Tests;

// Yanıt süresi son denemenin süresidir; yeniden deneme beklemesi ölçüme girmez
public class UptimeResponseTimeTests
{
    private sealed class FailThenOkHandler : HttpMessageHandler
    {
        private int _calls;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(Interlocked.Increment(ref _calls) == 1 ? HttpStatusCode.InternalServerError : HttpStatusCode.OK));
    }

    [Fact]
    public async Task Http_response_time_excludes_retry_wait()
    {
        using var client = new HttpClient(new FailThenOkHandler());
        var service = new Service { Id = "svc", Name = "svc", AcceptedStatusCodes = "200-299", HttpMethod = "GET" };

        var result = await HttpProtocolChecker.CheckAsync(client, service, "https://corvus.example.test/health",
            timeoutSeconds: 5, maxRetries: 1, retryIntervalSec: 2, CancellationToken.None);

        Assert.True(result.IsUp);
        Assert.InRange(result.ResponseTimeMs, 0, 1000);
    }
}
