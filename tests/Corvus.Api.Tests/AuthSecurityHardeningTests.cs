using System.Security.Cryptography;
using Corvus.Api.Data;
using Corvus.Api.Services.Auth;
using Corvus.Api.Services.Deployments;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class AuthSecurityHardeningTests
{
    private class InMemorySettingsRepo : ISettingsRepository
    {
        private readonly Dictionary<string, string> _dict = new();

        public InMemorySettingsRepo(string? deployToken = null)
        {
            if (deployToken != null) _dict["deploy_webhook_token"] = deployToken;
        }

        public Task<Dictionary<string, string>> GetAllAsync() => Task.FromResult(_dict);
        public Task<string?> GetAsync(string key) => Task.FromResult(_dict.TryGetValue(key, out var v) ? v : null);
        public Task SetAsync(string key, string value) { _dict[key] = value; return Task.CompletedTask; }
        public Task SetBatchAsync(Dictionary<string, string> settings) => Task.CompletedTask;
    }

    private static DeployWebhookTokenValidator CreateValidator(string? token, ILoginRateLimiter? limiter = null) =>
        new(new InMemorySettingsRepo(token), limiter ?? new LoginRateLimiter(), NullLogger<DeployWebhookTokenValidator>.Instance);

    [Fact]
    public void RateLimiter_Blocks_After_Five_Failed_Attempts_And_Resets()
    {
        var limiter = new LoginRateLimiter();
        const string key = "192.168.1.100:testuser";

        Assert.False(limiter.IsRateLimited(key));

        for (int i = 0; i < 4; i++)
        {
            limiter.RecordFailure(key);
            Assert.False(limiter.IsRateLimited(key));
        }

        limiter.RecordFailure(key);
        Assert.True(limiter.IsRateLimited(key));

        limiter.Reset(key);
        Assert.False(limiter.IsRateLimited(key));
    }

    [Fact]
    public void PasswordHasher_Hash_UsesCurrentIterations_AndVerifies()
    {
        string hash = PasswordHasher.Hash("correct-horse");

        Assert.StartsWith($"pbkdf2:{PasswordHasher.Pbkdf2Iterations}:", hash);
        Assert.True(PasswordHasher.Verify("correct-horse", hash, out bool needsRehash));
        Assert.False(needsRehash);
        Assert.False(PasswordHasher.Verify("wrong-horse", hash, out _));
    }

    [Fact]
    public void PasswordHasher_LowIterationHash_RequestsRehashOnlyOnMatch()
    {
        byte[] salt = RandomNumberGenerator.GetBytes(16);
        byte[] legacy = Rfc2898DeriveBytes.Pbkdf2("legacy-pass", salt, 100_000, HashAlgorithmName.SHA256, 32);
        string stored = $"pbkdf2:100000:{Convert.ToHexString(salt)}:{Convert.ToHexString(legacy)}";

        Assert.True(PasswordHasher.Verify("legacy-pass", stored, out bool rehashOnMatch));
        Assert.True(rehashOnMatch);

        Assert.False(PasswordHasher.Verify("other-pass", stored, out bool rehashOnMismatch));
        Assert.False(rehashOnMismatch);
    }

    [Fact]
    public async Task DeployWebhookValidator_AcceptsValidToken()
    {
        var result = await CreateValidator("secret-token-123").ValidateAsync("secret-token-123", "10.0.0.1");

        Assert.True(result.IsValid);
        Assert.Equal(200, result.StatusCode);
    }

    [Fact]
    public async Task DeployWebhookValidator_RejectsWrongAndEmptyTokens()
    {
        var validator = CreateValidator("secret-token-123");

        Assert.Equal(401, (await validator.ValidateAsync("wrong", "10.0.0.2")).StatusCode);
        Assert.Equal(400, (await validator.ValidateAsync("", "10.0.0.2")).StatusCode);
    }

    [Fact]
    public async Task DeployWebhookValidator_LocksOutIpAfterFiveFailures_EvenForValidToken()
    {
        var limiter = new LoginRateLimiter();
        var validator = CreateValidator("secret-token-123", limiter);

        for (int i = 0; i < 5; i++)
        {
            Assert.Equal(401, (await validator.ValidateAsync($"guess-{i}", "10.0.0.3")).StatusCode);
        }

        var locked = await validator.ValidateAsync("secret-token-123", "10.0.0.3");
        Assert.False(locked.IsValid);
        Assert.Equal(429, locked.StatusCode);

        // Diğer IP'ler etkilenmez
        Assert.True((await validator.ValidateAsync("secret-token-123", "10.0.0.4")).IsValid);
    }

    [Fact]
    public async Task DeployWebhookValidator_ReturnsForbidden_WhenNoTokenConfigured()
    {
        string? previous = Environment.GetEnvironmentVariable("CORVUS_DEPLOY_TOKEN");
        Environment.SetEnvironmentVariable("CORVUS_DEPLOY_TOKEN", null);
        try
        {
            var result = await CreateValidator(null).ValidateAsync("anything", "10.0.0.5");
            Assert.Equal(403, result.StatusCode);
        }
        finally
        {
            Environment.SetEnvironmentVariable("CORVUS_DEPLOY_TOKEN", previous);
        }
    }

    [Fact]
    public void FixedTimeTokenEquals_HandlesDifferentLengths()
    {
        Assert.True(DeployWebhookTokenValidator.FixedTimeTokenEquals("abc", "abc"));
        Assert.False(DeployWebhookTokenValidator.FixedTimeTokenEquals("abc", "abcd"));
    }
}
