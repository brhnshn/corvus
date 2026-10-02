using System.Collections.Concurrent;

namespace Corvus.Api.Services;

public class FlappingDetector : IFlappingDetector
{
    private class ServiceFlapState
    {
        public readonly object Lock = new();
        public string? LastStatus;
        public readonly List<DateTime> TransitionTimes = new();
        public bool IsFlapping;
        public int ConsecutiveChecksInSameStatus;
    }

    private readonly ConcurrentDictionary<string, ServiceFlapState> _states = new();

    public FlappingDecision Evaluate(
        string serviceId,
        string currentStatus,
        DateTime nowUtc,
        bool isEnabled = true,
        int threshold = 4,
        TimeSpan? window = null,
        int recoveryChecks = 3)
    {
        if (string.IsNullOrWhiteSpace(serviceId))
        {
            return FlappingDecision.Normal;
        }

        var state = _states.GetOrAdd(serviceId, _ => new ServiceFlapState());

        lock (state.Lock)
        {
            if (!isEnabled)
            {
                if (state.IsFlapping)
                {
                    state.IsFlapping = false;
                    state.TransitionTimes.Clear();
                }
                state.LastStatus = currentStatus;
                return FlappingDecision.Normal;
            }

            var actualWindow = window ?? TimeSpan.FromMinutes(10);
            DateTime cutoff = nowUtc - actualWindow;

            // Kayan pencere dışındaki eski geçiş zamanlarını temizle
            state.TransitionTimes.RemoveAll(t => t < cutoff);

            // Önceki duruma göre geçiş (transition) var mı?
            bool isTransition = state.LastStatus != null &&
                                !string.Equals(state.LastStatus, currentStatus, StringComparison.OrdinalIgnoreCase);

            if (isTransition)
            {
                state.TransitionTimes.Add(nowUtc);
                state.ConsecutiveChecksInSameStatus = 1;
            }
            else
            {
                state.ConsecutiveChecksInSameStatus++;
            }

            state.LastStatus = currentStatus;

            if (state.IsFlapping)
            {
                // Flapping modundayken: Kararlılık eşiğine (N ardışık aynı durum) ulaşıldı mı?
                if (state.ConsecutiveChecksInSameStatus >= recoveryChecks)
                {
                    state.IsFlapping = false;
                    state.TransitionTimes.Clear();
                    return FlappingDecision.FlappingRecovered;
                }

                // Hâlâ dalgalanıyor -> bildirimleri bastır (suppress)
                return FlappingDecision.Suppressed;
            }
            else
            {
                // Normal moddayken: Kayan penceredeki durum geçiş sayısı eşiğe ulaştı mı?
                if (state.TransitionTimes.Count >= threshold)
                {
                    state.IsFlapping = true;
                    state.ConsecutiveChecksInSameStatus = 0;
                    return FlappingDecision.FlappingStarted;
                }

                return FlappingDecision.Normal;
            }
        }
    }

    public bool IsFlapping(string serviceId)
    {
        if (string.IsNullOrWhiteSpace(serviceId)) return false;
        return _states.TryGetValue(serviceId, out var state) && state.IsFlapping;
    }

    public int GetTransitionCount(string serviceId, DateTime nowUtc, TimeSpan window)
    {
        if (string.IsNullOrWhiteSpace(serviceId) || !_states.TryGetValue(serviceId, out var state))
        {
            return 0;
        }

        lock (state.Lock)
        {
            DateTime cutoff = nowUtc - window;
            return state.TransitionTimes.Count(t => t >= cutoff);
        }
    }

    public void Reset(string serviceId)
    {
        if (!string.IsNullOrWhiteSpace(serviceId))
        {
            _states.TryRemove(serviceId, out _);
        }
    }
}
