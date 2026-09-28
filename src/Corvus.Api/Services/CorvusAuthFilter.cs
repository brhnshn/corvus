namespace Corvus.Api.Services;

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

        // 1. Zero-Trust SSO / Reverse Proxy Header Kontrolü (Güvenilir IP & Doğrulama Kontrolü)
        string? proxyUser = _auth.CheckProxyAuthHeader(httpContext.Request.Headers, httpContext.Connection.RemoteIpAddress);
        if (!string.IsNullOrEmpty(proxyUser))
        {
            return await next(context);
        }

        // 2. Cookie veya query param tabanlı oturum doğrulaması
        string? token = httpContext.Request.Cookies["corvus_session"];
        if (string.IsNullOrEmpty(token) && httpContext.Request.Query.TryGetValue("token", out var qToken))
        {
            token = qToken.ToString();
        }

        var (isValid, _) = _auth.ValidateSessionToken(token);
        if (isValid)
        {
            return await next(context);
        }

        return Results.Unauthorized();
    }
}
