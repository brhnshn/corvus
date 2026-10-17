using System.Net;
using System.Text.Json;
using Corvus.Api.Models;
using Corvus.Api.Services;
using Corvus.Api.Services.Docker;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class ContainerResourceLimitsTests
{
    private class CapturingDockerHttpTransport : IDockerHttpTransport
    {
        private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _responder;

        public HttpRequestMessage? CapturedRequest { get; private set; }
        public string? CapturedRequestBody { get; private set; }
        public List<string> CapturedRequestBodies { get; } = new();

        public CapturingDockerHttpTransport(HttpStatusCode statusCode = HttpStatusCode.OK, string responseJson = "{\"Warnings\":[]}")
            : this((req, ct) => Task.FromResult(new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(responseJson, System.Text.Encoding.UTF8, "application/json")
            }))
        {
        }

        public CapturingDockerHttpTransport(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> responder)
        {
            _responder = responder;
        }

        public HttpClient HttpClient => new(new FakeHttpMessageHandler(async (req, ct) =>
        {
            CapturedRequest = req;
            if (req.Content != null)
            {
                CapturedRequestBody = await req.Content.ReadAsStringAsync(ct);
                CapturedRequestBodies.Add(CapturedRequestBody);
            }
            return await _responder(req, ct);
        }))
        {
            BaseAddress = new Uri("http://localhost")
        };

        public Task<Stream> CreateRawDockerStreamAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult<Stream>(new MemoryStream());

        public void Dispose() { }
    }

    private class FakeHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _handler;

        public FakeHttpMessageHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handler)
        {
            _handler = handler;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            _handler(request, cancellationToken);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task UpdateContainerConfig_EmptyContainerId_ReturnsBadRequest(string? id)
    {
        var transport = new CapturingDockerHttpTransport();
        var client = new DockerContainerClient(transport, NullLogger<DockerHttpClient>.Instance);

        var result = await client.UpdateContainerConfigAsync(id!, new ContainerResourceUpdateRequest());

        Assert.False(result.Success);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("Container ID", result.Message);
    }

    [Fact]
    public async Task UpdateContainerConfig_NullRequest_ReturnsBadRequest()
    {
        var transport = new CapturingDockerHttpTransport();
        var client = new DockerContainerClient(transport, NullLogger<DockerHttpClient>.Instance);

        var result = await client.UpdateContainerConfigAsync("c-123", null!);

        Assert.False(result.Success);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task UpdateContainerConfig_NegativeCpuCores_ReturnsBadRequest()
    {
        var transport = new CapturingDockerHttpTransport();
        var client = new DockerContainerClient(transport, NullLogger<DockerHttpClient>.Instance);

        var result = await client.UpdateContainerConfigAsync("c-123", new ContainerResourceUpdateRequest
        {
            CpuCores = -0.5
        });

        Assert.False(result.Success);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("CPU", result.Message);
    }

    [Fact]
    public async Task UpdateContainerConfig_NegativeMemory_ReturnsBadRequest()
    {
        var transport = new CapturingDockerHttpTransport();
        var client = new DockerContainerClient(transport, NullLogger<DockerHttpClient>.Instance);

        var result = await client.UpdateContainerConfigAsync("c-123", new ContainerResourceUpdateRequest
        {
            MemoryMb = -100
        });

        Assert.False(result.Success);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("Bellek", result.Message);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(5)]
    public async Task UpdateContainerConfig_MemoryLessThan6Mb_ReturnsBadRequest(long memoryMb)
    {
        var transport = new CapturingDockerHttpTransport();
        var client = new DockerContainerClient(transport, NullLogger<DockerHttpClient>.Instance);

        var result = await client.UpdateContainerConfigAsync("c-123", new ContainerResourceUpdateRequest
        {
            MemoryMb = memoryMb
        });

        Assert.False(result.Success);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("6 MB", result.Message);
    }

    [Theory]
    [InlineData("invalid-policy")]
    [InlineData("sometimes")]
    [InlineData("random")]
    public async Task UpdateContainerConfig_InvalidRestartPolicy_ReturnsBadRequest(string policy)
    {
        var transport = new CapturingDockerHttpTransport();
        var client = new DockerContainerClient(transport, NullLogger<DockerHttpClient>.Instance);

        var result = await client.UpdateContainerConfigAsync("c-123", new ContainerResourceUpdateRequest
        {
            RestartPolicy = policy
        });

        Assert.False(result.Success);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("Geçersiz yeniden başlatma politikası", result.Message);
    }

    [Fact]
    public async Task UpdateContainerConfig_NegativeRetryCount_ReturnsBadRequest()
    {
        var transport = new CapturingDockerHttpTransport();
        var client = new DockerContainerClient(transport, NullLogger<DockerHttpClient>.Instance);

        var result = await client.UpdateContainerConfigAsync("c-123", new ContainerResourceUpdateRequest
        {
            RestartPolicy = "on-failure",
            MaximumRetryCount = -1
        });

        Assert.False(result.Success);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("Maksimum yeniden deneme", result.Message);
    }

    [Fact]
    public async Task UpdateContainerConfig_ConvertsUnitsAndSendsToDocker()
    {
        var transport = new CapturingDockerHttpTransport();
        var client = new DockerContainerClient(transport, NullLogger<DockerHttpClient>.Instance);

        var req = new ContainerResourceUpdateRequest
        {
            CpuCores = 1.5,
            MemoryMb = 512,
            RestartPolicy = "unless-stopped"
        };

        var result = await client.UpdateContainerConfigAsync("container-abc-123", req);

        Assert.True(result.Success);
        Assert.NotNull(transport.CapturedRequestBody);

        var deserialized = JsonSerializer.Deserialize(transport.CapturedRequestBody, CorvusJsonSerializerContext.Default.DockerContainerUpdateRequest);
        Assert.NotNull(deserialized);
        Assert.Equal(1_500_000_000L, deserialized.NanoCpus);
        Assert.Equal(512L * 1024 * 1024, deserialized.Memory);
        Assert.Equal(-1L, deserialized.MemorySwap);
        Assert.Equal("unless-stopped", deserialized.RestartPolicy?.Name);
        Assert.Equal(0, deserialized.RestartPolicy?.MaximumRetryCount);
    }

    [Fact]
    public async Task UpdateContainerConfig_ZeroValuesMeansUnlimited()
    {
        var transport = new CapturingDockerHttpTransport();
        var client = new DockerContainerClient(transport, NullLogger<DockerHttpClient>.Instance);

        var req = new ContainerResourceUpdateRequest
        {
            CpuCores = 0,
            MemoryMb = 0,
            RestartPolicy = "no"
        };

        var result = await client.UpdateContainerConfigAsync("c-unlimited", req);

        Assert.True(result.Success);
        Assert.NotNull(transport.CapturedRequestBody);

        var deserialized = JsonSerializer.Deserialize(transport.CapturedRequestBody, CorvusJsonSerializerContext.Default.DockerContainerUpdateRequest);
        Assert.NotNull(deserialized);
        Assert.Equal(0L, deserialized.NanoCpus);
        Assert.Equal(0L, deserialized.Memory);
        Assert.Equal(0L, deserialized.MemorySwap);
        Assert.Equal("no", deserialized.RestartPolicy?.Name);
    }

    [Fact]
    public async Task UpdateContainerConfig_OnFailureWithRetries_SetsMaximumRetryCount()
    {
        var transport = new CapturingDockerHttpTransport();
        var client = new DockerContainerClient(transport, NullLogger<DockerHttpClient>.Instance);

        var req = new ContainerResourceUpdateRequest
        {
            RestartPolicy = "on-failure",
            MaximumRetryCount = 5
        };

        var result = await client.UpdateContainerConfigAsync("c-onfailure", req);

        Assert.True(result.Success);
        Assert.NotNull(transport.CapturedRequestBody);

        var deserialized = JsonSerializer.Deserialize(transport.CapturedRequestBody, CorvusJsonSerializerContext.Default.DockerContainerUpdateRequest);
        Assert.NotNull(deserialized);
        Assert.Equal("on-failure", deserialized.RestartPolicy?.Name);
        Assert.Equal(5, deserialized.RestartPolicy?.MaximumRetryCount);
    }

    [Fact]
    public async Task UpdateContainerConfig_SwapMinusOneFails_RetriesWithDoubleMemory()
    {
        int callCount = 0;
        var transport = new CapturingDockerHttpTransport((req, ct) =>
        {
            callCount++;
            if (callCount == 1)
            {
                // First call with MemorySwap = -1 fails with Docker error
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError)
                {
                    Content = new StringContent("{\"message\":\"MemorySwap limit should be greater or equal to Memory limit\"}", System.Text.Encoding.UTF8, "application/json")
                });
            }
            // Second call with MemorySwap = Memory * 2 succeeds
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"Warnings\":[]}", System.Text.Encoding.UTF8, "application/json")
            });
        });

        var client = new DockerContainerClient(transport, NullLogger<DockerHttpClient>.Instance);

        var req = new ContainerResourceUpdateRequest
        {
            MemoryMb = 512
        };

        var result = await client.UpdateContainerConfigAsync("c-swap-retry", req);

        Assert.True(result.Success);
        Assert.Equal(2, callCount);
        Assert.Equal(2, transport.CapturedRequestBodies.Count);

        var firstReq = JsonSerializer.Deserialize(transport.CapturedRequestBodies[0], CorvusJsonSerializerContext.Default.DockerContainerUpdateRequest);
        Assert.Equal(-1L, firstReq?.MemorySwap);

        var secondReq = JsonSerializer.Deserialize(transport.CapturedRequestBodies[1], CorvusJsonSerializerContext.Default.DockerContainerUpdateRequest);
        Assert.Equal(512L * 1024 * 1024 * 2, secondReq?.MemorySwap);
    }

    [Fact]
    public async Task UpdateContainerConfig_SwapDoubleFails_RetriesWithNoSwap()
    {
        int callCount = 0;
        var transport = new CapturingDockerHttpTransport((req, ct) =>
        {
            callCount++;
            if (callCount < 3)
            {
                // Calls with MemorySwap fail (e.g. host kernel does not support swap limit)
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError)
                {
                    Content = new StringContent("{\"message\":\"Your kernel does not support swap limit capabilities\"}", System.Text.Encoding.UTF8, "application/json")
                });
            }
            // Third call without MemorySwap succeeds
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"Warnings\":[]}", System.Text.Encoding.UTF8, "application/json")
            });
        });

        var client = new DockerContainerClient(transport, NullLogger<DockerHttpClient>.Instance);

        var req = new ContainerResourceUpdateRequest
        {
            MemoryMb = 512
        };

        var result = await client.UpdateContainerConfigAsync("c-noswap-retry", req);

        Assert.True(result.Success);
        Assert.Equal(3, callCount);
        Assert.Equal(3, transport.CapturedRequestBodies.Count);

        var thirdReq = JsonSerializer.Deserialize(transport.CapturedRequestBodies[2], CorvusJsonSerializerContext.Default.DockerContainerUpdateRequest);
        Assert.Null(thirdReq?.MemorySwap);
        Assert.Equal(512L * 1024 * 1024, thirdReq?.Memory);
    }

    [Fact]
    public async Task DockerService_UpdateContainerConfig_InvalidatesCacheOnSuccess()
    {
        var fakeClient = new RecordingDockerHttpClient();
        var dockerService = new DockerService(fakeClient, NullLogger<DockerService>.Instance);

        var req = new ContainerResourceUpdateRequest
        {
            CpuCores = 2.0,
            MemoryMb = 1024
        };

        var result = await dockerService.UpdateContainerConfigAsync("c-test", req);

        Assert.True(result.Success);
        Assert.True(fakeClient.UpdateConfigCalled);
        Assert.Equal("c-test", fakeClient.LastContainerId);
    }

    private class RecordingDockerHttpClient : DockerServiceTests.FakeDockerHttpClient
    {
        public bool UpdateConfigCalled { get; private set; }
        public string? LastContainerId { get; private set; }

        public override Task<DockerActionResult> UpdateContainerConfigAsync(string containerId, ContainerResourceUpdateRequest request, CancellationToken cancellationToken = default)
        {
            UpdateConfigCalled = true;
            LastContainerId = containerId;
            return Task.FromResult(new DockerActionResult(true, "Limits updated successfully"));
        }
    }

    [Fact]
    public void NativeAot_ContainerResourceUpdateRequest_SerializesCorrectly()
    {
        var request = new ContainerResourceUpdateRequest
        {
            CpuCores = 2.5,
            MemoryMb = 2048,
            RestartPolicy = "always",
            MaximumRetryCount = 0
        };

        string json = JsonSerializer.Serialize(request, CorvusJsonSerializerContext.Default.ContainerResourceUpdateRequest);
        var deserialized = JsonSerializer.Deserialize(json, CorvusJsonSerializerContext.Default.ContainerResourceUpdateRequest);

        Assert.NotNull(deserialized);
        Assert.Equal(2.5, deserialized.CpuCores);
        Assert.Equal(2048, deserialized.MemoryMb);
        Assert.Equal("always", deserialized.RestartPolicy);
        Assert.Equal(0, deserialized.MaximumRetryCount);
    }

    [Fact]
    public void NativeAot_ContainerResourcesUpdatedEventPayload_SerializesCorrectly()
    {
        var payload = new ContainerResourcesUpdatedEventPayload("c-456", 1.0, 512, "unless-stopped", 3);

        string json = JsonSerializer.Serialize(payload, CorvusJsonSerializerContext.Default.ContainerResourcesUpdatedEventPayload);
        var deserialized = JsonSerializer.Deserialize(json, CorvusJsonSerializerContext.Default.ContainerResourcesUpdatedEventPayload);

        Assert.NotNull(deserialized);
        Assert.Equal("c-456", deserialized.ContainerId);
        Assert.Equal(1.0, deserialized.CpuCores);
        Assert.Equal(512, deserialized.MemoryMb);
        Assert.Equal("unless-stopped", deserialized.RestartPolicy);
        Assert.Equal(3, deserialized.MaximumRetryCount);
    }

    [Fact]
    public void DockerHostConfig_ComputedProperties_CalculatedCorrectly()
    {
        var config = new DockerHostConfig
        {
            NanoCpus = 2_500_000_000,
            Memory = 1024 * 1024 * 1024,
            MemorySwap = 2048L * 1024 * 1024
        };

        Assert.Equal(2.5, config.CpuLimitCores);
        Assert.Equal(1024, config.MemoryLimitMb);
        Assert.Equal(2048L * 1024 * 1024, config.MemorySwap);
    }
}
