using Corvus.Api.Models.Deployments;

namespace Corvus.Api.Services.Deployments;

public interface IDeploymentEngine
{
    Task<DeploymentRecord> StartDeploymentAsync(
        string containerId,
        string triggerType,
        string triggeredBy,
        bool pullLatest = true,
        CancellationToken cancellationToken = default);

    Task<DeploymentRecord> StartScratchDeploymentAsync(
        ScratchDeploymentRequest request,
        string triggeredBy = "user",
        CancellationToken cancellationToken = default);

    Task WaitForCompletionAsync(string deploymentId, TimeSpan timeout, CancellationToken cancellationToken = default);

    IAsyncEnumerable<DeploymentStreamMessage> SubscribeStreamAsync(string deploymentId, CancellationToken cancellationToken = default);
}

public record DeploymentStreamMessage(string EventType, string DataJson);
