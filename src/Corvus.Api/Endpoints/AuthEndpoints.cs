using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapGet("/status", async (HttpContext context, IAuthService auth) =>
        {
            bool hasUsers = await auth.HasUsersAsync();
            bool regEnabled = await auth.IsRegistrationEnabledAsync();

            if (!auth.IsAuthEnabled)
            {
                return Results.Ok(new AuthStatusResponse(false, true, "anonymous", hasUsers, regEnabled));
            }

            // Zero-Trust SSO / Reverse Proxy Header Kontrolü (Güvenilir IP & Doğrulama Kontrolü)
            string? proxyUser = auth.CheckProxyAuthHeader(context.Request.Headers, context.Connection.RemoteIpAddress);
            if (!string.IsNullOrEmpty(proxyUser))
            {
                return Results.Ok(new AuthStatusResponse(true, true, proxyUser, hasUsers, regEnabled));
            }

            string? token = context.Request.Cookies["corvus_session"];
            var (isAuth, username) = auth.ValidateSessionToken(token);

            return Results.Ok(new AuthStatusResponse(true, isAuth, isAuth ? username : null, hasUsers, regEnabled));
        });

        group.MapPost("/register", async (AuthRegisterRequest request, HttpContext context, IAuthService auth) =>
        {
            string username = request.Username?.Trim() ?? string.Empty;
            string password = request.Password ?? string.Empty;

            var (success, errorMessage) = await auth.RegisterAsync(username, password);
            if (!success)
            {
                return Results.BadRequest(new GenericApiResponse(false, errorMessage));
            }

            // Kayıt olan kullanıcıyı doğrudan oturum açmış olarak işaretle
            string token = auth.GenerateSessionToken(username);
            context.Response.Cookies.Append("corvus_session", token, new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddDays(7)
            });

            return Results.Ok(new GenericApiResponse(true, "Kayıt başarılı."));
        });

        group.MapPost("/login", async (AuthLoginRequest request, HttpContext context, IAuthService auth) =>
        {
            string clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            string userKey = request.Username?.Trim().ToLowerInvariant() ?? "";
            string attemptKey = $"{clientIp}:{userKey}";

            if (auth.IsAuthEnabled && (auth.IsLoginRateLimited(attemptKey) || auth.IsLoginRateLimited(clientIp)))
            {
                return Results.Json(
                    new GenericApiResponse(false, "Çok fazla başarısız giriş denemesi. Lütfen 1 dakika sonra tekrar deneyin."),
                    CorvusJsonSerializerContext.Default.GenericApiResponse,
                    statusCode: StatusCodes.Status429TooManyRequests);
            }

            string inputUsername = request.Username?.Trim() ?? string.Empty;
            string inputPassword = request.Password ?? string.Empty;
            var (valid, username) = await auth.ValidateCredentialsAsync(inputUsername, inputPassword);
            if (!valid || username == null)
            {
                auth.RecordLoginFailure(attemptKey);
                auth.RecordLoginFailure(clientIp);
                return Results.Unauthorized();
            }

            auth.ResetLoginAttempts(attemptKey);
            auth.ResetLoginAttempts(clientIp);

            string token = auth.GenerateSessionToken(username);
            context.Response.Cookies.Append("corvus_session", token, new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddDays(7)
            });

            return Results.Ok(new GenericApiResponse(true, "Giriş başarılı."));
        });

        group.MapPost("/toggle-registration", async (ToggleRegistrationRequest request, IAuthService auth) =>
        {
            await auth.SetRegistrationEnabledAsync(request.Enabled);
            string msg = request.Enabled ? "Kayıtlar başarıyla açıldı." : "Kayıtlar başarıyla kapatıldı.";
            return Results.Ok(new GenericApiResponse(true, msg));
        }).AddEndpointFilter<CorvusAuthFilter>();

        group.MapPost("/logout", (HttpContext context, IAuthService auth) =>
        {
            string? token = context.Request.Cookies["corvus_session"];
            auth.InvalidateSessionToken(token);
            context.Response.Cookies.Delete("corvus_session");
            return Results.Ok(new GenericApiResponse(true, "Çıkış yapıldı."));
        });
    }
}
