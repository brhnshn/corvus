using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.BackgroundServices;

public class ContainerDiscoveryService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<ContainerDiscoveryService> _logger;

    public ContainerDiscoveryService(IServiceProvider services, ILogger<ContainerDiscoveryService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ContainerDiscoveryService başlatıldı (Periyot: 10sn).");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var docker = scope.ServiceProvider.GetRequiredService<IDockerService>();
                var dockerClient = scope.ServiceProvider.GetService<IDockerHttpClient>();
                var repo = scope.ServiceProvider.GetRequiredService<IServicesRepository>();

                bool isDockerUp = await docker.IsAvailableAsync(stoppingToken);
                if (isDockerUp)
                {
                    var containers = await docker.GetContainersAsync(stoppingToken);
                    var activeIds = new List<string>(containers.Count);
                    var batchServices = new List<Service>(containers.Count);

                    foreach (var c in containers)
                    {
                        if (docker.ShouldIgnoreContainer(c))
                        {
                            continue;
                        }

                        activeIds.Add(c.Id);

                        List<string>? env = null;
                        if (dockerClient != null && DockerService.ExtractDomainFromLabels(c.Labels ?? new Dictionary<string, string>()) == null)
                        {
                            try
                            {
                                var inspect = await dockerClient.InspectContainerAsync(c.Id, stoppingToken);
                                env = inspect?.Config?.Env;
                            }
                            catch { }
                        }

                        batchServices.Add(docker.MapContainerToService(c, env));
                    }

                    await repo.SyncDockerBatchAsync(batchServices, activeIds);
                }
                else
                {
                    _logger.LogDebug("Docker daemon yanıt vermiyor, container keşfi atlandı.");
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Container keşfi döngüsünde hata oluştu.");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("ContainerDiscoveryService durduruldu.");
    }
}
