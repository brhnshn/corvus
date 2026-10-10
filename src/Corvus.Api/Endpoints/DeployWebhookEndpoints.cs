using System.Security.Cryptography;
using System.Text;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class DeployWebhookEndpoints
{
    public static void MapDeployWebhookEndpoints(this IEndpointRouteBuilder app)
    {
        // Yetkilendirme CorvusAuthFilter yerine URL token üzerinden yapılır (Inbound Webhook standardı)
        app.MapPost("/api/hooks/deploy/{token}", async (
            string token,
            DeployWebhookRequest? request,
            HttpContext context,
            ISettingsRepository settingsRepo,
            IDockerService docker,
            ILoggerFactory loggerFactory,
            CancellationToken ct) =>
        {
            var logger = loggerFactory.CreateLogger("DeployWebhookEndpoints");

            if (string.IsNullOrWhiteSpace(token))
            {
                return Results.Json(new DeployWebhookResult { Success = false, Message = "Token boş olamaz." },
                    CorvusJsonSerializerContext.Default.DeployWebhookResult, statusCode: 400);
            }

            // 1. Beklenen Token'ı Çöz
            var settings = await settingsRepo.GetAllAsync();
            string? expectedToken = null;
            if (settings.TryGetValue("deploy_webhook_token", out var dbToken) && !string.IsNullOrWhiteSpace(dbToken))
            {
                expectedToken = dbToken;
            }
            expectedToken ??= Environment.GetEnvironmentVariable("CORVUS_DEPLOY_TOKEN");

            if (string.IsNullOrWhiteSpace(expectedToken))
            {
                logger.LogWarning("Inbound deploy webhook çağrıldı ancak sistemde hiçbir token tanımlanmamış.");
                return Results.Json(new DeployWebhookResult 
                { 
                    Success = false, 
                    Message = "Deploy webhook belirteci yapılandırılmamış (Ayarlardan veya CORVUS_DEPLOY_TOKEN ile tanımlayın)." 
                }, CorvusJsonSerializerContext.Default.DeployWebhookResult, statusCode: 403);
            }

            // 2. Sabit Zamanlı Güvenli Token Karşılaştırması (Timing Attack Koruması)
            byte[] a = Encoding.UTF8.GetBytes(token);
            byte[] b = Encoding.UTF8.GetBytes(expectedToken);
            bool isValid = a.Length == b.Length && CryptographicOperations.FixedTimeEquals(a, b);

            if (!isValid)
            {
                logger.LogWarning("Geçersiz deploy webhook token denemesi: {Ip}", context.Connection.RemoteIpAddress);
                return Results.Json(new DeployWebhookResult 
                { 
                    Success = false, 
                    Message = "Yetkilendirme başarısız: Geçersiz webhook belirteci." 
                }, CorvusJsonSerializerContext.Default.DeployWebhookResult, statusCode: 401);
            }

            // 3. Dağıtım / Güncelleme Tetikleme
            bool pullLatest = request?.PullLatest ?? true;
            string? targetContainerId = request?.ContainerId ?? context.Request.Query["containerId"].ToString();
            string? targetProject = request?.ProjectName ?? context.Request.Query["projectName"].ToString();

            var restartedList = new List<string>();

            // Durum A: Belirli bir container
            if (!string.IsNullOrWhiteSpace(targetContainerId))
            {
                var recreateRes = await docker.RecreateContainerAsync(targetContainerId, pullLatest, ct);
                if (recreateRes.Success)
                {
                    restartedList.Add(targetContainerId);
                    logger.LogInformation("Webhook ile konteyner yeniden dağıtıldı: {ContainerId}", targetContainerId);
                    return Results.Json(new DeployWebhookResult
                    {
                        Success = true,
                        Message = $"Konteyner ({targetContainerId}) başarıyla güncellendi ve yeniden başlatıldı.",
                        RestartedContainers = restartedList
                    }, CorvusJsonSerializerContext.Default.DeployWebhookResult);
                }

                return Results.Json(new DeployWebhookResult
                {
                    Success = false,
                    Message = $"Konteyner yeniden başlatılamadı: {recreateRes.Message}",
                    RestartedContainers = restartedList
                }, CorvusJsonSerializerContext.Default.DeployWebhookResult, statusCode: 400);
            }

            // Durum B: Belirli bir Compose Projesi (Stack)
            if (!string.IsNullOrWhiteSpace(targetProject))
            {
                var allContainers = await docker.GetContainersAsync(ct);
                var projectContainers = allContainers.Where(c =>
                    c.Labels != null &&
                    c.Labels.TryGetValue("com.docker.compose.project", out var proj) &&
                    string.Equals(proj, targetProject, StringComparison.OrdinalIgnoreCase)
                ).ToList();

                if (projectContainers.Count == 0)
                {
                    return Results.Json(new DeployWebhookResult
                    {
                        Success = false,
                        Message = $"'{targetProject}' isimli Compose projesine ait konteyner bulunamadı."
                    }, CorvusJsonSerializerContext.Default.DeployWebhookResult, statusCode: 404);
                }

                foreach (var pc in projectContainers)
                {
                    var res = await docker.RecreateContainerAsync(pc.Id, pullLatest, ct);
                    if (res.Success)
                    {
                        restartedList.Add(pc.Id);
                    }
                }

                logger.LogInformation("Webhook ile Compose stack yeniden dağıtıldı: {Project} ({Count} konteyner)", targetProject, restartedList.Count);
                return Results.Json(new DeployWebhookResult
                {
                    Success = true,
                    Message = $"'{targetProject}' stack'indeki {restartedList.Count} konteyner başarıyla güncellendi ve yeniden başlatıldı.",
                    RestartedContainers = restartedList
                }, CorvusJsonSerializerContext.Default.DeployWebhookResult);
            }

            // Durum C: Genel tetikleme (Hedef belirtilmediğinde güncellemesi olan tüm container'lar)
            var updates = await docker.CheckAllContainersUpdateAsync(ct);
            var updatedContainers = updates.Where(u => u.HasUpdate).ToList();

            foreach (var up in updatedContainers)
            {
                var res = await docker.RecreateContainerAsync(up.ContainerId, pullLatest, ct);
                if (res.Success)
                {
                    restartedList.Add(up.ContainerId);
                }
            }

            logger.LogInformation("Genel deploy webhook tetiklendi: {Count} konteyner güncellendi.", restartedList.Count);
            return Results.Json(new DeployWebhookResult
            {
                Success = true,
                Message = restartedList.Count > 0 
                    ? $"{restartedList.Count} adet güncellenebilir konteyner başarıyla yeniden dağıtıldı."
                    : "Güncellenecek konteyner bulunamadı (tüm imajlar güncel).",
                RestartedContainers = restartedList
            }, CorvusJsonSerializerContext.Default.DeployWebhookResult);
        });
    }
}
