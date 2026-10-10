namespace Corvus.Api.Services.Notifications;

public static class NotificationMessageFormatter
{
    public static (string Title, string Message) FormatServiceAlert(string serviceName, string? url, bool isDown, string? errorMessage, bool isTr)
    {
        string title = isDown 
            ? (isTr ? $"[SERVİS KESİNTİSİ] {serviceName}" : $"[SERVICE OUTAGE] {serviceName}")
            : (isTr ? $"[SERVİS KURTARILDI] {serviceName}" : $"[SERVICE RECOVERED] {serviceName}");

        string message = isDown
            ? (isTr
                ? $"Servis erişilemez durumda!\nURL: {url ?? "Belirtilmedi"}\nHata: {errorMessage ?? "Bilinmiyor"}\nZaman: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
                : $"Service is unreachable!\nURL: {url ?? "Not specified"}\nError: {errorMessage ?? "Unknown"}\nTime: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC")
            : (isTr
                ? $"Servis tekrar sağlıklı şekilde yanıt veriyor.\nURL: {url ?? "Belirtilmedi"}\nZaman: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
                : $"Service is responding healthy again.\nURL: {url ?? "Not specified"}\nTime: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");

        return (title, message);
    }

    public static (string Title, string Message, bool IsCritical) FormatSslExpiryAlert(string serviceName, string? url, int daysRemaining, string? issuer, bool isTr)
    {
        bool isCritical = daysRemaining <= 7;
        string title = isCritical
            ? (isTr ? $"[KRİTİK SSL UYARISI] {serviceName}" : $"[CRITICAL SSL ALERT] {serviceName}")
            : (isTr ? $"[SSL YENİLEME UYARISI] {serviceName}" : $"[SSL RENEWAL ALERT] {serviceName}");

        string message = isTr
            ? $"SSL sertifikasının bitmesine {daysRemaining} gün kaldı!\nServis: {serviceName}\nURL: {url ?? "Belirtilmedi"}\nSağlayıcı: {issuer ?? "Bilinmiyor"}\nLütfen sertifikanızı en kısa sürede yenileyin.\nZaman: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
            : $"SSL certificate will expire in {daysRemaining} days!\nService: {serviceName}\nURL: {url ?? "Not specified"}\nIssuer: {issuer ?? "Unknown"}\nPlease renew your certificate soon.\nTime: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC";

        return (title, message, isCritical);
    }

    public static (string Title, string Message, string BadgeColor, int DiscordColor) FormatFlappingAlert(string serviceName, string? url, bool isRecovered, int transitionCount, bool isTr)
    {
        string title = isRecovered
            ? (isTr ? $"[DALGALANMA SONA ERDİ] {serviceName}" : $"[FLAPPING RESOLVED] {serviceName}")
            : (isTr ? $"[DALGALANMA TESPİT EDİLDİ] {serviceName}" : $"[FLAPPING DETECTED] {serviceName}");

        string message = isRecovered
            ? (isTr
                ? $"Servis ardışık başarılı kontroller vererek kararlı duruma ulaştı.\nBildirim susturması kaldırıldı, normal izleme devrede.\nServis: {serviceName}\nURL: {url ?? "Belirtilmedi"}\nZaman: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
                : $"Service stabilized across consecutive checks.\nNotification suppression lifted; normal monitoring resumed.\nService: {serviceName}\nURL: {url ?? "Not specified"}\nTime: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC")
            : (isTr
                ? $"Servis kısa süre içinde {transitionCount} kez durum değiştirdi (UP/DOWN).\nAğ dalgalanması veya yeniden başlama döngüsü tespit edildi.\nBildirimler servis kararlı hale gelene kadar geçici olarak durduruldu.\nServis: {serviceName}\nURL: {url ?? "Belirtilmedi"}\nZaman: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
                : $"Service changed status {transitionCount} times in a short window (UP/DOWN).\nNetwork instability or crash loop detected.\nNotifications are temporarily suppressed until service stabilizes.\nService: {serviceName}\nURL: {url ?? "Not specified"}\nTime: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");

        string badgeColor = isRecovered ? "#22c55e" : "#f59e0b";
        int discordColor = isRecovered ? 5763719 : 16098851;

        return (title, message, badgeColor, discordColor);
    }

    public static (string Title, string Message) FormatContainerCrashAlert(string containerName, string containerId, int exitCode, string? errorReason, bool isTr)
    {
        string title = isTr
            ? $"[KONTEYNER BEKLENMEDİK ŞEKİLDE DURDU] {containerName}"
            : $"[CONTAINER CRASH / EXIT] {containerName}";

        string message = isTr
            ? $"Docker konteyneri sıfır olmayan bir çıkış koduyla durdu veya çöktü.\nKonteyner: {containerName}\nID: {containerId.Substring(0, Math.Min(12, containerId.Length))}\nÇıkış Kodu (Exit Code): {exitCode}\nSebep / Hata: {errorReason ?? "Bilinmiyor"}\nZaman: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
            : $"Docker container exited with non-zero exit code or crashed.\nContainer: {containerName}\nID: {containerId.Substring(0, Math.Min(12, containerId.Length))}\nExit Code: {exitCode}\nReason / Error: {errorReason ?? "Unknown"}\nTime: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC";

        return (title, message);
    }

    public static (string Title, string Message, string BadgeColor, int DiscordColor) FormatContainerAutoHealedAlert(string containerName, string containerId, int exitCode, bool success, string? detailMessage, bool isTr)
    {
        string title = success
            ? (isTr ? $"[KONTEYNER OTOMATİK KURTARILDI] {containerName}" : $"[CONTAINER AUTO-HEALED] {containerName}")
            : (isTr ? $"[DÖNGÜ ÖNLEME / KURTARMA BAŞARISIZ] {containerName}" : $"[CRASH LOOP / AUTO-HEAL ABORTED] {containerName}");

        string message = success
            ? (isTr
                ? $"Konteyner beklenmedik şekilde durduktan sonra otomatik olarak yeniden başlatıldı ve kurtarıldı.\nKonteyner: {containerName}\nID: {containerId.Substring(0, Math.Min(12, containerId.Length))}\nÇıkış Kodu: {exitCode}\nDurum: {detailMessage ?? "Başarıyla kurtarıldı"}\nZaman: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
                : $"Container was automatically restarted and recovered after unexpected exit.\nContainer: {containerName}\nID: {containerId.Substring(0, Math.Min(12, containerId.Length))}\nExit Code: {exitCode}\nStatus: {detailMessage ?? "Successfully recovered"}\nTime: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC")
            : (isTr
                ? $"Konteyner için otomatik kurtarma denemesi başarısız oldu veya crash-loop sınırına ulaşıldı.\nKonteyner: {containerName}\nID: {containerId.Substring(0, Math.Min(12, containerId.Length))}\nNeden: {detailMessage ?? "Sonsuz döngü koruması devreye girdi"}\nZaman: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
                : $"Auto-healing failed or crash loop limit reached for container.\nContainer: {containerName}\nID: {containerId.Substring(0, Math.Min(12, containerId.Length))}\nReason: {detailMessage ?? "Crash loop protection triggered"}\nTime: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");

        string badgeColor = success ? "#10b981" : "#f59e0b";
        int discordColor = success ? 5763719 : 16098851;

        return (title, message, badgeColor, discordColor);
    }

    public static (string Title, string Message, string BadgeColor, int DiscordColor) FormatMetricThresholdAlert(
        string ruleName, 
        string targetDescription, 
        string metric, 
        double thresholdValue, 
        double currentValue, 
        bool isResolved, 
        bool isTr)
    {
        string metricName = metric.ToUpperInvariant();
        string title = isResolved
            ? (isTr ? $"[DÜZELDİ] {ruleName} ({metricName})" : $"[RESOLVED] {ruleName} ({metricName})")
            : (isTr ? $"[EŞİK AŞIMI UYARISI] {ruleName} ({metricName})" : $"[THRESHOLD EXCEEDED] {ruleName} ({metricName})");

        string message = isResolved
            ? (isTr 
                ? $"Hedef: {targetDescription}\n{metricName} değeri normale döndü: %{currentValue:F1} (Eşik: %{thresholdValue:F1})"
                : $"Target: {targetDescription}\n{metricName} returned to normal: {currentValue:F1}% (Threshold: {thresholdValue:F1}%)")
            : (isTr
                ? $"Hedef: {targetDescription}\n{metricName} eşik değerini aştı!\nMevcut Değer: %{currentValue:F1}\nTanımlı Eşik: %{thresholdValue:F1}"
                : $"Target: {targetDescription}\n{metricName} exceeded threshold!\nCurrent: {currentValue:F1}%\nThreshold: {thresholdValue:F1}%");

        string badgeColor = isResolved ? "#22c55e" : "#ef4444";
        int discordColor = isResolved ? 0x22c55e : 0xef4444;

        return (title, message, badgeColor, discordColor);
    }
}
