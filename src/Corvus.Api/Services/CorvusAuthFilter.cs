using Corvus.Api.Models;

namespace Corvus.Api.Services;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequireAdminAttribute : Attribute { }

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class AllowViewerAttribute : Attribute { }

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

    public static RouteHandlerBuilder AllowViewer(this RouteHandlerBuilder builder)
    {
        return builder.WithMetadata(new AllowViewerAttribute());
    }

    public static RouteGroupBuilder AllowViewer(this RouteGroupBuilder builder)
    {
        return builder.WithMetadata(new AllowViewerAttribute());
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
            // 2. Cookie, Authorization header veya özel akışlar (WebSocket/SSE) için query param doğrulaması
            string? token = httpContext.Request.Cookies["corvus_session"];
            if (string.IsNullOrEmpty(token))
            {
                string? authHeader = httpContext.Request.Headers.Authorization.ToString();
                if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    token = authHeader.Substring(7).Trim();
                }
            }

            // Güvenlik sıkılaştırması: ?token= query parametresi YALNIZCA tarayıcıların özel başlık ekleyemediği
            // WebSocket ve SSE (EventSource) akışlarında kabul edilir; standart REST API çağrılarında URL sızıntısını engellemek için reddedilir.
            if (string.IsNullOrEmpty(token) && httpContext.Request.Query.TryGetValue("token", out var qToken))
            {
                bool isSpecialStream = httpContext.WebSockets.IsWebSocketRequest ||
                                      httpContext.Request.Path.Value?.Contains("/stream", StringComparison.OrdinalIgnoreCase) == true ||
                                      httpContext.Request.Path.Value?.Contains("/terminal", StringComparison.OrdinalIgnoreCase) == true ||
                                      httpContext.Request.Path.Value?.Contains("/tunnel", StringComparison.OrdinalIgnoreCase) == true;

                if (isSpecialStream)
                {
                    token = qToken.ToString();
                }
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

        var endpoint = httpContext.GetEndpoint();

        // RBAC Denetimi 1: Eğer uç nokta RequireAdminAttribute istiyorsa ve rol admin değilse 403 Forbidden dön
        bool requiresAdmin = endpoint?.Metadata.GetMetadata<RequireAdminAttribute>() != null;
        if (requiresAdmin && !string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase))
        {
            return Results.Json(
                new GenericApiResponse(false, "Bu işlem için 'admin' yetkisi gerekmektedir."),
                CorvusJsonSerializerContext.Default.GenericApiResponse,
                statusCode: StatusCodes.Status403Forbidden);
        }

        // RBAC Denetimi 2: Salt-okunur (viewer) kullanıcılar kaynak değiştirici (POST, PUT, DELETE, PATCH) işlemleri yapamaz
        bool isMutatingMethod = HttpMethods.IsPost(httpContext.Request.Method) ||
                               HttpMethods.IsPut(httpContext.Request.Method) ||
                               HttpMethods.IsDelete(httpContext.Request.Method) ||
                               HttpMethods.IsPatch(httpContext.Request.Method);

        bool isAllowedForViewer = endpoint?.Metadata.GetMetadata<AllowViewerAttribute>() != null ||
                                 httpContext.Request.Path.StartsWithSegments("/api/auth/logout", StringComparison.OrdinalIgnoreCase) ||
                                 httpContext.Request.Path.StartsWithSegments("/api/auth/change-password", StringComparison.OrdinalIgnoreCase);

        if (string.Equals(role, "viewer", StringComparison.OrdinalIgnoreCase) && isMutatingMethod && !isAllowedForViewer)
        {
            return Results.Json(
                new GenericApiResponse(false, "Salt-okunur (viewer) hesabı bu işlemi gerçekleştiremez."),
                CorvusJsonSerializerContext.Default.GenericApiResponse,
                statusCode: StatusCodes.Status403Forbidden);
        }

        return await next(context);
    }
}
