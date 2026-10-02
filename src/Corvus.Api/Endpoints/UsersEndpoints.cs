using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class UsersEndpoints
{
    public static void MapUsersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users")
            .AddEndpointFilter<CorvusAuthFilter>()
            .RequireAdmin();

        group.MapGet("/", async (IAuthService auth) =>
        {
            var users = await auth.GetAllUsersAsync();
            return Results.Ok(users);
        });

        group.MapPost("/", async (CreateUserRequest request, IAuthService auth) =>
        {
            var (success, error) = await auth.CreateUserAsync(request.Username, request.Password, request.Role);
            if (!success)
            {
                return Results.BadRequest(new GenericApiResponse(false, error ?? "Kullanıcı oluşturulamadı."));
            }

            return Results.Ok(new GenericApiResponse(true, "Kullanıcı başarıyla oluşturuldu."));
        });

        group.MapDelete("/{id}", async (string id, HttpContext context, IAuthService auth) =>
        {
            string currentUsername = context.Items["Corvus_User"] as string ?? string.Empty;
            var (success, error) = await auth.DeleteUserAsync(id, currentUsername);
            if (!success)
            {
                return Results.BadRequest(new GenericApiResponse(false, error ?? "Kullanıcı silinemedi."));
            }

            return Results.Ok(new GenericApiResponse(true, "Kullanıcı silindi."));
        });
    }
}
