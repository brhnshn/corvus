namespace Corvus.Api.Services;

public enum FlappingDecision
{
    Normal,
    FlappingStarted,
    Suppressed,
    FlappingRecovered
}

public interface IFlappingDetector
{
    FlappingDecision Evaluate(
        string serviceId,
        string currentStatus,
        DateTime nowUtc,
        bool isEnabled = true,
        int threshold = 4,
        TimeSpan? window = null,
        int recoveryChecks = 3);

    bool IsFlapping(string serviceId);
    int GetTransitionCount(string serviceId, DateTime nowUtc, TimeSpan window);
    void Reset(string serviceId);
}
