using Corvus.Api.Models;

namespace Corvus.Api.Services;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequireAdminAttribute : Attribute { }

public static class RouteHandlerBuilderAdminExtensions
{
    public static RouteHandlerBuilder RequireAdmin(this RouteHandlerBuilder builder)
    {
        return builder.WithMetadata(new RequireAdminAttribute());
    }

    public static RouteGroupBuilder RequireAdmin(this RouteGroupBuilder builder)
    {
        return builder.WithMetadata(new RequireAdminAttribute());
    }
}

public class CorvusAuthFilter : IEndpointFilter
{
    private readonly IAuthService _auth;

    public CorvusAuthFilter(IAuthService auth)
    {
        _auth = auth;
    }

    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        if (!_auth.IsAuthEnabled)
        {
            return await next(context);
        }

        var httpContext = context.HttpContext;
        string? username = null;

        // 1. Zero-Trust SSO / Reverse Proxy Header Kontrolü (Güvenilir IP & Doğrulama Kontrolü)
        string? proxyUser = _auth.CheckProxyAuthHeader(httpContext.Request.Headers, httpContext.Connection.RemoteIpAddress);
        if (!string.IsNullOrEmpty(proxyUser))
        {
            username = proxyUser;
        }
        else
        {
            // 2. Cookie veya query param tabanlı oturum doğrulaması
            string? token = httpContext.Request.Cookies["corvus_session"];
            if (string.IsNullOrEmpty(token) && httpContext.Request.Query.TryGetValue("token", out var qToken))
            {
                token = qToken.ToString();
            }

            var (isValid, user) = _auth.ValidateSessionToken(token);
            if (!isValid)
            {
                return Results.Unauthorized();
            }
            username = user;
        }

        string role = await _auth.GetUserRoleAsync(username ?? "anonymous");
        httpContext.Items["Corvus_User"] = username;
        httpContext.Items["Corvus_Role"] = role;

        // RBAC Denetimi: Eğer uç nokta RequireAdminAttribute istiyorsa ve rol admin değilse 403 Forbidden dön
        var endpoint = httpContext.GetEndpoint();
        bool requiresAdmin = endpoint?.Metadata.GetMetadata<RequireAdminAttribute>() != null;

        if (requiresAdmin && !string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase))
        {
            return Results.Json(
                new GenericApiResponse(false, "Bu işlem için 'admin' yetkisi gerekmektedir."),
                CorvusJsonSerializerContext.Default.GenericApiResponse,
                statusCode: StatusCodes.Status403Forbidden);
        }

        return await next(context);
    }
}
