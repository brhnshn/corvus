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
            IDockerService docker,
            Corvus.Api.Services.Deployments.IDeploymentEngine deploymentEngine,
            IDeploymentRepository deploymentRepo,
            Corvus.Api.Services.Deployments.IDeployWebhookTokenValidator tokenValidator,
            ILoggerFactory loggerFactory,
            CancellationToken ct) =>
        {
            var logger = loggerFactory.CreateLogger("DeployWebhookEndpoints");

            string clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var tokenCheck = await tokenValidator.ValidateAsync(token, clientIp);
            if (!tokenCheck.IsValid)
            {
                return Results.Json(new DeployWebhookResult { Success = false, Message = tokenCheck.ErrorMessage ?? string.Empty },
                    CorvusJsonSerializerContext.Default.DeployWebhookResult, statusCode: tokenCheck.StatusCode);
            }

            // Dağıtım / Güncelleme Tetikleme
            bool pullLatest = request?.PullLatest ?? true;
            string? targetContainerId = request?.ContainerId ?? context.Request.Query["containerId"].ToString();
            string? targetProject = request?.ProjectName ?? context.Request.Query["projectName"].ToString();
            bool waitSync = false;
            if (context.Request.Query.TryGetValue("wait", out var waitVal) &&
                (string.Equals(waitVal, "true", StringComparison.OrdinalIgnoreCase) || waitVal == "1"))
            {
                waitSync = true;
            }

            var restartedList = new List<string>();

            // Durum A: Belirli bir container
            if (!string.IsNullOrWhiteSpace(targetContainerId))
            {
                try
                {
                    var depRecord = await deploymentEngine.StartDeploymentAsync(
                        targetContainerId,
                        "webhook_github",
                        "github_actions",
                        pullLatest,
                        ct);

                    restartedList.Add(targetContainerId);

                    if (waitSync)
                    {
                        logger.LogInformation("Webhook senkron bekleme modu devrede (&wait=true, maks 120 sn): {DeploymentId}", depRecord.Id);
                        await deploymentEngine.WaitForCompletionAsync(depRecord.Id, TimeSpan.FromSeconds(120), ct);

                        var finalRecord = await deploymentRepo.GetByIdAsync(depRecord.Id);
                        if (finalRecord != null && (finalRecord.Status == "failed" || finalRecord.Status == "rolled_back"))
                        {
                            return Results.Json(new DeployWebhookResult
                            {
                                Success = false,
                                Message = $"Dağıtım başarısız oldu ({finalRecord.Status}): {finalRecord.ErrorMessage}",
                                RestartedContainers = restartedList
                            }, CorvusJsonSerializerContext.Default.DeployWebhookResult, statusCode: 500);
                        }

                        return Results.Json(new DeployWebhookResult
                        {
                            Success = true,
                            Message = $"Konteyner ({targetContainerId}) başarıyla güncellendi ve doğrulandı (Deployment ID: {depRecord.Id}).",
                            RestartedContainers = restartedList
                        }, CorvusJsonSerializerContext.Default.DeployWebhookResult);
                    }

                    return Results.Json(new DeployWebhookResult
                    {
                        Success = true,
                        Message = $"Konteyner ({targetContainerId}) dağıtımı başlatıldı (Deployment ID: {depRecord.Id}).",
                        RestartedContainers = restartedList
                    }, CorvusJsonSerializerContext.Default.DeployWebhookResult);
                }
                catch (TimeoutException tex)
                {
                    logger.LogError(tex, "Webhook dağıtımı zaman aşımına uğradı.");
                    return Results.Json(new DeployWebhookResult
                    {
                        Success = false,
                        Message = tex.Message,
                        RestartedContainers = restartedList
                    }, CorvusJsonSerializerContext.Default.DeployWebhookResult, statusCode: 504);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Webhook dağıtımı başarısız oldu.");
                    return Results.Json(new DeployWebhookResult
                    {
                        Success = false,
                        Message = $"Konteyner dağıtılamadı: {ex.Message}",
                        RestartedContainers = restartedList
                    }, CorvusJsonSerializerContext.Default.DeployWebhookResult, statusCode: 500);
                }
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
                    try
                    {
                        var dep = await deploymentEngine.StartDeploymentAsync(pc.Id, "webhook_github", "github_actions", pullLatest, ct);
                        restartedList.Add(pc.Id);
                        if (waitSync)
                        {
                            await deploymentEngine.WaitForCompletionAsync(dep.Id, TimeSpan.FromSeconds(120), ct);
                        }
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Compose konteyneri {ContainerId} güncellenirken hata", pc.Id);
                    }
                }

                logger.LogInformation("Webhook ile Compose stack yeniden dağıtıldı: {Project} ({Count} konteyner)",
                    Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(targetProject),
                    restartedList.Count);

                return Results.Json(new DeployWebhookResult
                {
                    Success = restartedList.Count > 0,
                    Message = $"'{targetProject}' stack'indeki {restartedList.Count} konteyner dağıtıldı.",
                    RestartedContainers = restartedList
                }, CorvusJsonSerializerContext.Default.DeployWebhookResult, statusCode: restartedList.Count > 0 ? 200 : 500);
            }

            // Durum C: Genel tetikleme (Hedef belirtilmediğinde güncellemesi olan tüm container'lar)
            var updates = await docker.CheckAllContainersUpdateAsync(ct);
            var updatedContainers = updates.Where(u => u.HasUpdate).ToList();

            foreach (var up in updatedContainers)
            {
                try
                {
                    var dep = await deploymentEngine.StartDeploymentAsync(up.ContainerId, "webhook_github", "github_actions", pullLatest, ct);
                    restartedList.Add(up.ContainerId);
                    if (waitSync)
                    {
                        await deploymentEngine.WaitForCompletionAsync(dep.Id, TimeSpan.FromSeconds(120), ct);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Konteyner {ContainerId} güncellenirken hata", up.ContainerId);
                }
            }

            logger.LogInformation("Genel deploy webhook tetiklendi: {Count} konteyner güncellendi.", restartedList.Count);
            return Results.Json(new DeployWebhookResult
            {
                Success = true,
                Message = restartedList.Count > 0 
                    ? $"{restartedList.Count} adet güncellenebilir konteyner için dağıtım başlatıldı."
                    : "Güncellenecek konteyner bulunamadı (tüm imajlar güncel).",
                RestartedContainers = restartedList
            }, CorvusJsonSerializerContext.Default.DeployWebhookResult);
        });
    }
}
