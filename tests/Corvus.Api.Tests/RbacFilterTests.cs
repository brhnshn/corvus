using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Corvus.Api.Tests;

public class RbacFilterTests
{
    private class FakeUserRepo : IUserRepository
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

        public Task<bool> UpdatePasswordAsync(string username, string newPasswordHash) => Task.FromResult(true);

        public Task<bool> UpdateRoleAsync(string id, string newRole)
        {
            var u = _users.FirstOrDefault(x => x.Id == id);
            if (u == null) return Task.FromResult(false);
            u.Role = newRole;
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

    private class FakeSettingsRepo : ISettingsRepository
    {
        public Task<string?> GetAsync(string key) => Task.FromResult<string?>(null);
        public Task SetAsync(string key, string value) => Task.CompletedTask;
        public Task SetBatchAsync(Dictionary<string, string> settings) => Task.CompletedTask;
        public Task<Dictionary<string, string>> GetAllAsync() => Task.FromResult(new Dictionary<string, string>());
    }

    private static (AuthService auth, FakeUserRepo userRepo) CreateAuthService()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["CORVUS_AUTH_ENABLED"] = "true",
                ["Corvus:Auth:Enabled"] = "true"
            })
            .Build();

        var userRepo = new FakeUserRepo();
        var settingsRepo = new FakeSettingsRepo();
        var auth = new AuthService(userRepo, settingsRepo, config);
        return (auth, userRepo);
    }

    [Fact]
    public async Task Viewer_Cannot_Perform_Mutating_Actions_Returns_403()
    {
        var (auth, userRepo) = CreateAuthService();
        await userRepo.CreateAsync(new User
        {
            Id = "u_viewer",
            Username = "viewer_user",
            PasswordHash = "hash",
            Role = "viewer",
            CreatedAt = "2026-01-01"
        });

        string token = auth.GenerateSessionToken("viewer_user");

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Method = "POST";
        httpContext.Request.Path = "/api/containers/test-container/restart";
        httpContext.Request.Headers.Cookie = $"corvus_session={token}";

        var filter = new CorvusAuthFilter(auth);
        bool nextInvoked = false;

        var context = new DefaultEndpointFilterInvocationContext(httpContext);
        var result = await filter.InvokeAsync(context, _ =>
        {
            nextInvoked = true;
            return ValueTask.FromResult<object?>(Results.Ok());
        });

        Assert.False(nextInvoked);
        Assert.NotNull(result);
        var jsonResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, jsonResult.StatusCode);
    }

    [Fact]
    public async Task Viewer_Is_Allowed_On_Get_Requests()
    {
        var (auth, userRepo) = CreateAuthService();
        await userRepo.CreateAsync(new User
        {
            Id = "u_viewer",
            Username = "viewer_user",
            PasswordHash = "hash",
            Role = "viewer",
            CreatedAt = "2026-01-01"
        });

        string token = auth.GenerateSessionToken("viewer_user");

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Method = "GET";
        httpContext.Request.Path = "/api/containers";
        httpContext.Request.Headers.Cookie = $"corvus_session={token}";

        var filter = new CorvusAuthFilter(auth);
        bool nextInvoked = false;

        var context = new DefaultEndpointFilterInvocationContext(httpContext);
        var result = await filter.InvokeAsync(context, _ =>
        {
            nextInvoked = true;
            return ValueTask.FromResult<object?>(Results.Ok("containers_list"));
        });

        Assert.True(nextInvoked);
    }

    [Fact]
    public async Task Admin_Can_Perform_Mutating_Actions()
    {
        var (auth, userRepo) = CreateAuthService();
        await userRepo.CreateAsync(new User
        {
            Id = "u_admin",
            Username = "admin_user",
            PasswordHash = "hash",
            Role = "admin",
            CreatedAt = "2026-01-01"
        });

        string token = auth.GenerateSessionToken("admin_user");

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Method = "POST";
        httpContext.Request.Path = "/api/containers/test-container/restart";
        httpContext.Request.Headers.Cookie = $"corvus_session={token}";

        var filter = new CorvusAuthFilter(auth);
        bool nextInvoked = false;

        var context = new DefaultEndpointFilterInvocationContext(httpContext);
        await filter.InvokeAsync(context, _ =>
        {
            nextInvoked = true;
            return ValueTask.FromResult<object?>(Results.Ok());
        });

        Assert.True(nextInvoked);
    }

    [Fact]
    public async Task Operator_Can_Perform_Mutating_Actions_Except_Admin_Required()
    {
        var (auth, userRepo) = CreateAuthService();
        await userRepo.CreateAsync(new User
        {
            Id = "u_operator",
            Username = "operator_user",
            PasswordHash = "hash",
            Role = "operator",
            CreatedAt = "2026-01-01"
        });

        string token = auth.GenerateSessionToken("operator_user");

        // 1. Konteyner yeniden başlatma (operator için serbest)
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Method = "POST";
        httpContext.Request.Path = "/api/containers/test-container/restart";
        httpContext.Request.Headers.Cookie = $"corvus_session={token}";

        var filter = new CorvusAuthFilter(auth);
        bool restartInvoked = false;
        var context = new DefaultEndpointFilterInvocationContext(httpContext);
        await filter.InvokeAsync(context, _ =>
        {
            restartInvoked = true;
            return ValueTask.FromResult<object?>(Results.Ok());
        });
        Assert.True(restartInvoked);

        // 2. Admin gerektiren uç nokta (operator için 403)
        var adminContext = new DefaultHttpContext();
        adminContext.Request.Method = "POST";
        adminContext.Request.Path = "/api/users";
        adminContext.Request.Headers.Cookie = $"corvus_session={token}";
        adminContext.SetEndpoint(new Endpoint(
            _ => Task.CompletedTask,
            new EndpointMetadataCollection(new RequireAdminAttribute()),
            "CreateUser"
        ));

        bool adminInvoked = false;
        var filterContext = new DefaultEndpointFilterInvocationContext(adminContext);
        var result = await filter.InvokeAsync(filterContext, _ =>
        {
            adminInvoked = true;
            return ValueTask.FromResult<object?>(Results.Ok());
        });

        Assert.False(adminInvoked);
        var jsonResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        Assert.Equal(StatusCodes.Status403Forbidden, jsonResult.StatusCode);
    }

    [Fact]
    public async Task UpdateUserRole_Protects_Last_Admin_And_Updates_Role()
    {
        var (auth, userRepo) = CreateAuthService();
        await userRepo.CreateAsync(new User
        {
            Id = "admin1",
            Username = "primary_admin",
            PasswordHash = "hash",
            Role = "admin",
            CreatedAt = "2026-01-01"
        });

        await userRepo.CreateAsync(new User
        {
            Id = "viewer1",
            Username = "sub_user",
            PasswordHash = "hash",
            Role = "viewer",
            CreatedAt = "2026-01-01"
        });

        // 1. Tek admin varken admin'i viewer yapmaya çalışmak reddedilmeli
        var (failSuccess, failMsg) = await auth.UpdateUserRoleAsync("admin1", "viewer", "primary_admin");
        Assert.False(failSuccess);
        Assert.NotNull(failMsg);

        // 2. Viewer kullanıcıyı operator yapmak başarılı olmalı
        var (okSuccess, okMsg) = await auth.UpdateUserRoleAsync("viewer1", "operator", "primary_admin");
        Assert.True(okSuccess);
        Assert.Null(okMsg);

        var updated = await userRepo.GetByIdAsync("viewer1");
        Assert.Equal("operator", updated?.Role);
    }
}
