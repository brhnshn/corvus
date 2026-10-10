using System.Net;
using Corvus.Api.Models;
using Corvus.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class OciRegistryClientTests
{
    [Theory]
    [InlineData("nginx", "registry-1.docker.io", "library/nginx", "latest")]
    [InlineData("nginx:alpine", "registry-1.docker.io", "library/nginx", "alpine")]
    [InlineData("redis:7.2", "registry-1.docker.io", "library/redis", "7.2")]
    [InlineData("portainer/portainer-ce:latest", "registry-1.docker.io", "portainer/portainer-ce", "latest")]
    [InlineData("ghcr.io/owner/repo:v1.2.3", "ghcr.io", "owner/repo", "v1.2.3")]
    [InlineData("quay.io/argoproj/argocd:v2.8", "quay.io", "argoproj/argocd", "v2.8")]
    [InlineData("custom.registry.io:5000/team/service:prod", "custom.registry.io:5000", "team/service", "prod")]
    [InlineData("docker.io/library/ubuntu:24.04", "registry-1.docker.io", "library/ubuntu", "24.04")]
    public void ParseImage_ParsesCorrectly(string input, string expectedRegistry, string expectedRepo, string expectedTag)
    {
        var client = new OciRegistryClient(new HttpClient(), NullLogger<OciRegistryClient>.Instance);
        var parsed = client.ParseImage(input);

        Assert.Equal(expectedRegistry, parsed.Registry);
        Assert.Equal(expectedRepo, parsed.Repository);
        Assert.Equal(expectedTag, parsed.Tag);
    }

    private class MockHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;

        public MockHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
        {
            _responder = responder;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(_responder(request));
        }
    }

    [Fact]
    public async Task CheckContainerUpdateAsync_WhenDigestsMatch_ReturnsHasUpdateFalse()
    {
        var handler = new MockHttpMessageHandler(req =>
        {
            if (req.RequestUri!.Host.Contains("auth.docker.io"))
            {
                var resp = new HttpResponseMessage(HttpStatusCode.OK);
                resp.Content = new StringContent("{\"token\":\"fake-token\"}");
                return resp;
            }

            if (req.Method == HttpMethod.Head)
            {
                var resp = new HttpResponseMessage(HttpStatusCode.OK);
                resp.Headers.TryAddWithoutValidation("Docker-Content-Digest", "sha256:1111222233334444");
                return resp;
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });

        var httpClient = new HttpClient(handler);
        var client = new OciRegistryClient(httpClient, NullLogger<OciRegistryClient>.Instance);

        var repoDigests = new List<string> { "nginx@sha256:1111222233334444" };
        var result = await client.CheckContainerUpdateAsync("c1", "nginx:latest", "sha256:local", repoDigests);

        Assert.False(result.HasUpdate);
        Assert.Equal("sha256:1111222233334444", result.LocalDigest);
        Assert.Equal("sha256:1111222233334444", result.RemoteDigest);
        Assert.Null(result.Error);
    }

    [Fact]
    public async Task CheckContainerUpdateAsync_WhenDigestsDiffer_ReturnsHasUpdateTrue()
    {
        var handler = new MockHttpMessageHandler(req =>
        {
            if (req.RequestUri!.Host.Contains("auth.docker.io"))
            {
                var resp = new HttpResponseMessage(HttpStatusCode.OK);
                resp.Content = new StringContent("{\"token\":\"fake-token\"}");
                return resp;
            }

            if (req.Method == HttpMethod.Head)
            {
                var resp = new HttpResponseMessage(HttpStatusCode.OK);
                resp.Headers.TryAddWithoutValidation("Docker-Content-Digest", "sha256:NEW_REMOTE_DIGEST");
                return resp;
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });

        var httpClient = new HttpClient(handler);
        var client = new OciRegistryClient(httpClient, NullLogger<OciRegistryClient>.Instance);

        var repoDigests = new List<string> { "nginx@sha256:OLD_LOCAL_DIGEST" };
        var result = await client.CheckContainerUpdateAsync("c1", "nginx:latest", "sha256:local", repoDigests);

        Assert.True(result.HasUpdate);
        Assert.Equal("sha256:OLD_LOCAL_DIGEST", result.LocalDigest);
        Assert.Equal("sha256:NEW_REMOTE_DIGEST", result.RemoteDigest);
    }

    [Fact]
    public async Task CheckContainerUpdateAsync_WhenRemoteFails_ReturnsError()
    {
        var handler = new MockHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.BadGateway));
        var httpClient = new HttpClient(handler);
        var client = new OciRegistryClient(httpClient, NullLogger<OciRegistryClient>.Instance);

        var result = await client.CheckContainerUpdateAsync("c1", "custom/image:latest", "sha256:local", null);

        Assert.False(result.HasUpdate);
        Assert.NotNull(result.Error);
    }

    [Fact]
    public async Task DockerService_CheckContainerUpdateAsync_DelegatesCorrectly()
    {
        var fakeHttp = new DockerServiceTests.FakeDockerHttpClient();
        var fakeInspect = new DockerContainerInspectInfo
        {
            Id = "container_abc",
            Config = new DockerContainerConfig { Image = "nginx:alpine" },
            Image = "sha256:fake_local_image_id"
        };

        var customHttp = new CustomInspectDockerClient(fakeInspect);

        var handler = new MockHttpMessageHandler(req =>
        {
            if (req.RequestUri!.Host.Contains("auth.docker.io"))
            {
                var resp = new HttpResponseMessage(HttpStatusCode.OK);
                resp.Content = new StringContent("{\"token\":\"test-token\"}");
                return resp;
            }
            if (req.Method == HttpMethod.Head)
            {
                var resp = new HttpResponseMessage(HttpStatusCode.OK);
                resp.Headers.TryAddWithoutValidation("Docker-Content-Digest", "sha256:latest_digest");
                return resp;
            }
            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });

        var ociClient = new OciRegistryClient(new HttpClient(handler), NullLogger<OciRegistryClient>.Instance);
        var dockerService = new DockerService(customHttp, NullLogger<DockerService>.Instance, ociClient);

        var result = await dockerService.CheckContainerUpdateAsync("container_abc");

        Assert.Equal("container_abc", result.ContainerId);
        Assert.Equal("nginx:alpine", result.Image);
        Assert.Equal("sha256:latest_digest", result.RemoteDigest);
    }

    private class CustomInspectDockerClient : DockerServiceTests.FakeDockerHttpClient
    {
        private readonly DockerContainerInspectInfo _inspectInfo;

        public CustomInspectDockerClient(DockerContainerInspectInfo inspectInfo)
        {
            _inspectInfo = inspectInfo;
        }

        public override Task<DockerContainerInspectInfo?> InspectContainerAsync(string containerId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<DockerContainerInspectInfo?>(_inspectInfo);
        }

        public override Task<DockerImageInspectInfo?> InspectImageAsync(string imageIdOrName, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<DockerImageInspectInfo?>(new DockerImageInspectInfo
            {
                Id = imageIdOrName,
                RepoDigests = new List<string> { "nginx@sha256:old_local_digest" }
            });
        }
    }
}
