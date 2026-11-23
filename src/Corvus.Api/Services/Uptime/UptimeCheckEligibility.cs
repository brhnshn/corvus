using Corvus.Api.Models;

namespace Corvus.Api.Services.Uptime;

// Bir servisin bu turda uptime denetiminden muaf tutulup tutulmayacağına karar verir
public static class UptimeCheckEligibility
{
    // Docker konteyneri durdurulmuşsa denetim atlanır (degraded/down üretmemek için).
    // services.status tek başına yetmez: 'down' değerini denetimin kendisi de yazar; ona bakarak atlamak
    // servisi kurtulsa bile sonsuza dek 'down'da bırakır. Bu yüzden önce Docker'ın gerçek durumuna bakılır.
    public static bool IsContainerStopped(Service s, IReadOnlyDictionary<string, string>? containerStates)
    {
        if (s.Source != "docker")
        {
            return false;
        }

        if (containerStates != null && !string.IsNullOrEmpty(s.ContainerId)
            && containerStates.TryGetValue(s.ContainerId, out var state))
        {
            return state != "running";
        }

        // Docker erişilemiyor veya konteyner bu düğümde değil (uzak sistem): kayıtlı duruma güven
        return s.Status == "down";
    }
}
