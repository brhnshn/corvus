using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Corvus.Api.Tests;

public class AuthServiceTests
{
    private class FakeUserRepository : IUserRepository
    {
        private readonly List<User> _users = new();

        public Task<User?> GetByUsernameAsync(string username) =>
            Task.FromResult(_users.FirstOrDefault(u => string.Equals(u.Username, username, StringComparison.OrdinalIgnoreCase)));

        public Task<int> GetCountAsync() => Task.FromResult(_users.Count);

        public Task CreateAsync(User user)
        {
            _users.Add(user);
            return Task.CompletedTask;
        }

        public Task<bool> UpdatePasswordAsync(string username, string newPasswordHash)
        {
            var u = _users.FirstOrDefault(x => string.Equals(x.Username, username, StringComparison.OrdinalIgnoreCase));
            if (u == null) return Task.FromResult(false);
            u.PasswordHash = newPasswordHash;
            return Task.FromResult(true);
        }
    }

    private class FakeSettingsRepository : ISettingsRepository
    {
        private readonly Dictionary<string, string> _dict = new();

        public Task<string?> GetAsync(string key) =>
            Task.FromResult(_dict.TryGetValue(key, out var v) ? v : null);

        public Task SetAsync(string key, string value)
        {
            _dict[key] = value;
            return Task.CompletedTask;
        }

        public Task<Dictionary<string, string>> GetAllAsync() =>
            Task.FromResult(new Dictionary<string, string>(_dict));

        public Task SetBatchAsync(Dictionary<string, string> settings)
        {
            foreach (var (k, v) in settings)
            {
                _dict[k] = v;
            }
            return Task.CompletedTask;
        }
    }

    private static AuthService CreateService(
        FakeUserRepository? userRepo = null, 
        FakeSettingsRepository? settings = null,
        bool authEnabled = true,
        bool trustProxyHeaders = false)
    {
        userRepo ??= new FakeUserRepository();
        settings ??= new FakeSettingsRepository();
        
        Environment.SetEnvironmentVariable("CORVUS_AUTH_ENABLED", authEnabled ? "true" : "false");
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new[]
            {
                new KeyValuePair<string, string?>("Auth:TrustProxyHeaders", trustProxyHeaders ? "true" : "false")
            })
            .Build();
        return new AuthService(userRepo, settings, config);
    }

    [Fact]
    public async Task RegisterAsync_Succeeds_When_Registration_Enabled()
    {
        var authService = CreateService();

        var (success, error) = await authService.RegisterAsync("newadmin", "securePass123");

        Assert.True(success);
        Assert.Null(error);
        Assert.True(await authService.HasUsersAsync());
    }

    [Fact]
    public async Task RegisterAsync_Fails_When_Registration_Disabled()
    {
        var settings = new FakeSettingsRepository();
        await settings.SetAsync("registration_enabled", "false");
        var authService = CreateService(settings: settings);

        var (success, error) = await authService.RegisterAsync("secondadmin", "pass123");

        Assert.False(success);
        Assert.Equal("Yeni kullanıcı kayıtları kapatılmıştır.", error);
    }

    [Fact]
    public async Task RegisterAsync_Fails_On_Duplicate_Username()
    {
        var authService = CreateService();
        await authService.RegisterAsync("sameuser", "pass123");

        var (success, error) = await authService.RegisterAsync("sameuser", "otherpass");

        Assert.False(success);
        Assert.Equal("Bu kullanıcı adı zaten kayıtlı.", error);
    }

    [Fact]
    public async Task ValidateCredentialsAsync_Succeeds_With_Correct_Password()
    {
        var authService = CreateService();
        await authService.RegisterAsync("tester", "mySecret123");

        var (valid, username) = await authService.ValidateCredentialsAsync("tester", "mySecret123");
        Assert.True(valid);
        Assert.Equal("tester", username);

        var (invalid, _) = await authService.ValidateCredentialsAsync("tester", "wrongPassword");
        Assert.False(invalid);
    }

    [Fact]
    public void SessionToken_LifeCycle_Works()
    {
        var authService = CreateService();
        string token = authService.GenerateSessionToken("testuser");

        var (isValid, user) = authService.ValidateSessionToken(token);
        Assert.True(isValid);
        Assert.Equal("testuser", user);

        authService.InvalidateSessionToken(token);
        var (isInvalidAfter, _) = authService.ValidateSessionToken(token);
        Assert.False(isInvalidAfter);
    }

    [Fact]
    public async Task ToggleRegistration_Updates_Setting_Correctly()
    {
        var authService = CreateService();
        Assert.True(await authService.IsRegistrationEnabledAsync());

        await authService.SetRegistrationEnabledAsync(false);
        Assert.False(await authService.IsRegistrationEnabledAsync());

        await authService.SetRegistrationEnabledAsync(true);
        Assert.True(await authService.IsRegistrationEnabledAsync());
    }

    [Fact]
    public void CheckProxyAuthHeader_Rejects_When_TrustProxyHeaders_Not_Enabled()
    {
        var authService = CreateService(trustProxyHeaders: false);
        var headers = new Microsoft.AspNetCore.Http.HeaderDictionary
        {
            ["Tailscale-User-Login"] = "admin@my-tailscale.ts.net"
        };

        string? user = authService.CheckProxyAuthHeader(headers, System.Net.IPAddress.Loopback);
        Assert.Null(user);
    }

    [Fact]
    public void CheckProxyAuthHeader_Extracts_Identity_When_TrustProxyHeaders_Enabled_And_Loopback()
    {
        var authService = CreateService(trustProxyHeaders: true);
        var headers = new Microsoft.AspNetCore.Http.HeaderDictionary
        {
            ["Tailscale-User-Login"] = "admin@my-tailscale.ts.net"
        };

        string? user = authService.CheckProxyAuthHeader(headers, System.Net.IPAddress.Loopback);
        Assert.Equal("admin@my-tailscale.ts.net", user);

        var headersCf = new Microsoft.AspNetCore.Http.HeaderDictionary
        {
            ["Cf-Access-Authenticated-User-Email"] = "devops@company.com"
        };
        string? userCf = authService.CheckProxyAuthHeader(headersCf, System.Net.IPAddress.IPv6Loopback);
        Assert.Equal("devops@company.com", userCf);
    }

    [Fact]
    public void CheckProxyAuthHeader_Rejects_External_IP_Even_When_TrustProxyHeaders_Enabled()
    {
        var authService = CreateService(trustProxyHeaders: true);
        var headers = new Microsoft.AspNetCore.Http.HeaderDictionary
        {
            ["Remote-User"] = "admin"
        };

        var externalIp = System.Net.IPAddress.Parse("198.51.100.25");
        string? user = authService.CheckProxyAuthHeader(headers, externalIp);
        Assert.Null(user);
    }

    [Fact]
    public async Task CorvusAuthFilter_Blocks_Proxy_Header_When_Not_Configured()
    {
        var authService = CreateService(trustProxyHeaders: false);
        var filter = new CorvusAuthFilter(authService);

        var httpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        httpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("192.168.1.50");
        httpContext.Request.Headers["Remote-User"] = "admin";

        var filterContext = Microsoft.AspNetCore.Http.EndpointFilterInvocationContext.Create(httpContext);
        bool nextCalled = false;

        var result = await filter.InvokeAsync(filterContext, _ =>
        {
            nextCalled = true;
            return ValueTask.FromResult<object?>("success");
        });

        Assert.False(nextCalled);
        Assert.NotNull(result);
    }

    [Fact]
    public async Task CorvusAuthFilter_Allows_When_Proxy_Header_Trusted_And_Loopback()
    {
        var authService = CreateService(trustProxyHeaders: true);
        var filter = new CorvusAuthFilter(authService);

        var httpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        httpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Loopback;
        httpContext.Request.Headers["Tailscale-User-Login"] = "admin@tailscale";

        var filterContext = Microsoft.AspNetCore.Http.EndpointFilterInvocationContext.Create(httpContext);
        bool nextCalled = false;

        var result = await filter.InvokeAsync(filterContext, _ =>
        {
            nextCalled = true;
            return ValueTask.FromResult<object?>("success");
        });

        Assert.True(nextCalled);
        Assert.Equal("success", result);
    }

    [Fact]
    public async Task ValidateCredentials_Transparently_Rehashes_Legacy_Sha256_Password()
    {
        var userRepo = new FakeUserRepository();
        // Legacy SHA-256 hash of "legacySecret"
        byte[] legacyHashBytes = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes("legacySecret"));
        string legacyHash = Convert.ToHexString(legacyHashBytes);

        await userRepo.CreateAsync(new User
        {
            Id = "user-legacy",
            Username = "olduser",
            PasswordHash = legacyHash,
            Role = "admin",
            CreatedAt = DateTime.UtcNow.ToString("o")
        });

        var authService = CreateService(userRepo: userRepo);

        var (success, username) = await authService.ValidateCredentialsAsync("olduser", "legacySecret");
        Assert.True(success);
        Assert.Equal("olduser", username);

        // Verify password was automatically upgraded to PBKDF2
        var updatedUser = await userRepo.GetByUsernameAsync("olduser");
        Assert.NotNull(updatedUser);
        Assert.StartsWith("pbkdf2:100000:", updatedUser.PasswordHash);

        // Next login works with PBKDF2
        var (secondLogin, _) = await authService.ValidateCredentialsAsync("olduser", "legacySecret");
        Assert.True(secondLogin);
    }

    [Fact]
    public async Task CorvusAuthFilter_Allows_When_Valid_Session_Cookie_Present()
    {
        var authService = CreateService();
        var filter = new CorvusAuthFilter(authService);

        string token = authService.GenerateSessionToken("admin");

        var httpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        httpContext.Request.Headers["Cookie"] = $"corvus_session={token}";

        var filterContext = Microsoft.AspNetCore.Http.EndpointFilterInvocationContext.Create(httpContext);
        bool nextCalled = false;

        var result = await filter.InvokeAsync(filterContext, _ =>
        {
            nextCalled = true;
            return ValueTask.FromResult<object?>("success");
        });

        Assert.True(nextCalled);
        Assert.Equal("success", result);
    }

    [Fact]
    public async Task CorvusAuthFilter_Returns_Unauthorized_When_Unauthenticated()
    {
        var authService = CreateService();
        var filter = new CorvusAuthFilter(authService);

        var httpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        var filterContext = Microsoft.AspNetCore.Http.EndpointFilterInvocationContext.Create(httpContext);
        bool nextCalled = false;

        var result = await filter.InvokeAsync(filterContext, _ =>
        {
            nextCalled = true;
            return ValueTask.FromResult<object?>("success");
        });

        Assert.False(nextCalled);
        Assert.NotNull(result);
        Assert.IsAssignableFrom<Microsoft.AspNetCore.Http.IResult>(result);
    }

    [Fact]
    public void RateLimiting_Blocks_After_Five_Failed_Attempts_And_Resets()
    {
        var authService = CreateService();
        string testKey = "192.168.1.100:testuser";

        // Initially not rate limited
        Assert.False(authService.IsLoginRateLimited(testKey));

        // 4 failed attempts should still not trigger lockout
        for (int i = 0; i < 4; i++)
        {
            authService.RecordLoginFailure(testKey);
            Assert.False(authService.IsLoginRateLimited(testKey));
        }

        // 5th failed attempt triggers lockout
        authService.RecordLoginFailure(testKey);
        Assert.True(authService.IsLoginRateLimited(testKey));

        // Reset clears lockout
        authService.ResetLoginAttempts(testKey);
        Assert.False(authService.IsLoginRateLimited(testKey));
    }
}
