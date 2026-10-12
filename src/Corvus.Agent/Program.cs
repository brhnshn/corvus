using Corvus.Agent.Services;

namespace Corvus.Agent;

public static class Program
{
    public static async Task Main(string[] args)
    {
        Console.WriteLine("========================================");
        Console.WriteLine(" Corvus Agent — Edge Host Telemetry Node");
        Console.WriteLine("========================================");

        string? hubUrl = Environment.GetEnvironmentVariable("CORVUS_HUB_URL")
                         ?? Environment.GetEnvironmentVariable("HUB_URL");

        string? nodeKey = Environment.GetEnvironmentVariable("CORVUS_NODE_KEY")
                          ?? Environment.GetEnvironmentVariable("NODE_KEY");

        // Parametre argümanlarından kontrol (--hub-url, --node-key)
        for (int i = 0; i < args.Length; i++)
        {
            if (args[i] == "--hub-url" && i + 1 < args.Length) hubUrl = args[i + 1];
            if (args[i] == "--node-key" && i + 1 < args.Length) nodeKey = args[i + 1];
        }

        if (string.IsNullOrWhiteSpace(hubUrl) || string.IsNullOrWhiteSpace(nodeKey))
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("HATA: HUB_URL ve NODE_KEY ortam değişkenleri veya argümanları zorunludur!");
            Console.ResetColor();
            Console.WriteLine("Kullanım: docker run -e HUB_URL=\"...\" -e NODE_KEY=\"...\" ghcr.io/corvus/agent:latest");
            Environment.Exit(1);
            return;
        }

        using var cts = new CancellationTokenSource();
        Console.CancelKeyPress += (_, e) =>
        {
            e.Cancel = true;
            Console.WriteLine("\n[Corvus Agent] Kapatılıyor...");
            cts.Cancel();
        };

        var metricCollector = new SystemMetricCollector();
        var dockerClient = new AgentDockerClient();
        var tunnelClient = new AgentTunnelClient(metricCollector, dockerClient);

        try
        {
            await tunnelClient.RunTunnelAsync(hubUrl, nodeKey, cts.Token);
        }
        catch (OperationCanceledException)
        {
            // Graceful shutdown
        }

        Console.WriteLine("[Corvus Agent] Güvenle kapatıldı.");
    }
}
