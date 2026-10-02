using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;
using Microsoft.AspNetCore.Http;
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

        public Task<User?> GetByIdAsync(string id) =>
            Task.FromResult(_users.FirstOrDefault(u => u.Id == id));

        public Task<List<User>> GetAllAsync() =>
            Task.FromResult(_users.ToList());

        public Task<bool> DeleteAsync(string id)
        {
            var u = _users.FirstOrDefault(x => x.Id == id);
            if (u == null) return Task.FromResult(false);
            _users.Remove(u);
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

    [Fact]
    public async Task ChangePassword_Success_UpdatesHash_AndAllowsNewLogin()
    {
        var userRepo = new FakeUserRepository();
        var authService = CreateService(userRepo: userRepo);

        await authService.SetRegistrationEnabledAsync(true);
        await authService.RegisterAsync("alice", "initialSecret");

        // Change password
        var (success, error) = await authService.ChangePasswordAsync("alice", "initialSecret", "newSuperSecret");
        Assert.True(success);
        Assert.Null(error);

        // Old password fails
        var (oldValid, _) = await authService.ValidateCredentialsAsync("alice", "initialSecret");
        Assert.False(oldValid);

        // New password works
        var (newValid, user) = await authService.ValidateCredentialsAsync("alice", "newSuperSecret");
        Assert.True(newValid);
        Assert.Equal("alice", user);
    }

    [Fact]
    public async Task ChangePassword_Fails_WhenCurrentPasswordIncorrect()
    {
        var userRepo = new FakeUserRepository();
        var authService = CreateService(userRepo: userRepo);

        await authService.SetRegistrationEnabledAsync(true);
        await authService.RegisterAsync("bob", "bobSecret");

        var (success, error) = await authService.ChangePasswordAsync("bob", "wrongPassword", "newSecret");
        Assert.False(success);
        Assert.Equal("Mevcut şifre hatalı.", error);
    }

    [Fact]
    public async Task ChangePassword_Fails_WhenNewPasswordTooShort()
    {
        var userRepo = new FakeUserRepository();
        var authService = CreateService(userRepo: userRepo);

        await authService.SetRegistrationEnabledAsync(true);
        await authService.RegisterAsync("charlie", "charlieSecret");

        var (success, error) = await authService.ChangePasswordAsync("charlie", "charlieSecret", "12");
        Assert.False(success);
        Assert.Contains("en az 4 karakter", error);
    }

    [Fact]
    public async Task CreateUser_Success_AddsAdminOrViewer()
    {
        var userRepo = new FakeUserRepository();
        var authService = CreateService(userRepo: userRepo);

        var (success1, _) = await authService.CreateUserAsync("manager", "managerPass", "admin");
        Assert.True(success1);

        var (success2, _) = await authService.CreateUserAsync("viewer1", "viewerPass", "viewer");
        Assert.True(success2);

        var users = await authService.GetAllUsersAsync();
        Assert.Equal(2, users.Count);

        var managerRole = await authService.GetUserRoleAsync("manager");
        Assert.Equal("admin", managerRole);

        var viewerRole = await authService.GetUserRoleAsync("viewer1");
        Assert.Equal("viewer", viewerRole);
    }

    [Fact]
    public async Task CreateUser_Fails_WhenDuplicateUsername()
    {
        var userRepo = new FakeUserRepository();
        var authService = CreateService(userRepo: userRepo);

        await authService.CreateUserAsync("dave", "davePass", "viewer");
        var (success, error) = await authService.CreateUserAsync("DAVE", "anotherPass", "admin");

        Assert.False(success);
        Assert.Contains("zaten kayıtlı", error);
    }

    [Fact]
    public async Task DeleteUser_Success_RemovesUser_AndPreventsDeletingSelf_OrLastAdmin()
    {
        var userRepo = new FakeUserRepository();
        var authService = CreateService(userRepo: userRepo);

        // Add 2 admins and 1 viewer
        await authService.CreateUserAsync("admin1", "pass1234", "admin");
        await authService.CreateUserAsync("admin2", "pass1234", "admin");
        await authService.CreateUserAsync("viewer1", "pass1234", "viewer");

        var users = await authService.GetAllUsersAsync();
        var admin1 = users.First(u => u.Username == "admin1");
        var admin2 = users.First(u => u.Username == "admin2");
        var viewer1 = users.First(u => u.Username == "viewer1");

        // 1. Cannot delete self
        var (selfDelSuccess, selfDelErr) = await authService.DeleteUserAsync(admin1.Id, "admin1");
        Assert.False(selfDelSuccess);
        Assert.Equal("Kendi hesabınızı silemezsiniz.", selfDelErr);

        // 2. Can delete viewer
        var (viewerDelSuccess, _) = await authService.DeleteUserAsync(viewer1.Id, "admin1");
        Assert.True(viewerDelSuccess);

        // 3. Can delete admin2 because admin1 still exists (total admins = 2)
        var (admin2DelSuccess, _) = await authService.DeleteUserAsync(admin2.Id, "admin1");
        Assert.True(admin2DelSuccess);

        // 4. Now admin1 is the LAST admin; deleting admin1 by another hypothetical user should fail
        var (lastAdminDelSuccess, lastAdminDelErr) = await authService.DeleteUserAsync(admin1.Id, "otheruser");
        Assert.False(lastAdminDelSuccess);
        Assert.Equal("Sistemdeki son yönetici hesabı silinemez.", lastAdminDelErr);
    }

    [Fact]
    public async Task CorvusAuthFilter_BlocksViewer_WhenEndpointRequiresAdmin()
    {
        var userRepo = new FakeUserRepository();
        var authService = CreateService(userRepo: userRepo);
        await authService.CreateUserAsync("readonlyuser", "pass1234", "viewer");

        var filter = new CorvusAuthFilter(authService);
        string token = authService.GenerateSessionToken("readonlyuser");

        var httpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        httpContext.Request.Headers["Cookie"] = $"corvus_session={token}";

        // Endpoint has RequireAdminAttribute metadata
        var endpoint = new Microsoft.AspNetCore.Http.Endpoint(
            _ => Task.CompletedTask,
            new Microsoft.AspNetCore.Http.EndpointMetadataCollection(new RequireAdminAttribute()),
            "AdminRequiredEndpoint"
        );
        httpContext.SetEndpoint(endpoint);

        var filterContext = Microsoft.AspNetCore.Http.EndpointFilterInvocationContext.Create(httpContext);
        bool nextCalled = false;

        var result = await filter.InvokeAsync(filterContext, _ =>
        {
            nextCalled = true;
            return ValueTask.FromResult<object?>("success");
        });

        Assert.False(nextCalled);
        Assert.NotNull(result);
        // Returns 403 Forbidden
        var jsonResult = Assert.IsAssignableFrom<Microsoft.AspNetCore.Http.IStatusCodeHttpResult>(result);
        Assert.Equal(403, jsonResult.StatusCode);
    }

    [Fact]
    public async Task CorvusAuthFilter_AllowsAdmin_WhenEndpointRequiresAdmin()
    {
        var userRepo = new FakeUserRepository();
        var authService = CreateService(userRepo: userRepo);
        await authService.CreateUserAsync("superadmin", "pass1234", "admin");

        var filter = new CorvusAuthFilter(authService);
        string token = authService.GenerateSessionToken("superadmin");

        var httpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext();
        httpContext.Request.Headers["Cookie"] = $"corvus_session={token}";

        var endpoint = new Microsoft.AspNetCore.Http.Endpoint(
            _ => Task.CompletedTask,
            new Microsoft.AspNetCore.Http.EndpointMetadataCollection(new RequireAdminAttribute()),
            "AdminRequiredEndpoint"
        );
        httpContext.SetEndpoint(endpoint);

        var filterContext = Microsoft.AspNetCore.Http.EndpointFilterInvocationContext.Create(httpContext);
        bool nextCalled = false;

        var result = await filter.InvokeAsync(filterContext, _ =>
        {
            nextCalled = true;
            return ValueTask.FromResult<object?>("success");
        });

        Assert.True(nextCalled);
        Assert.Equal("success", result);
        Assert.Equal("superadmin", httpContext.Items["Corvus_User"]);
        Assert.Equal("admin", httpContext.Items["Corvus_Role"]);
    }
}
