using System.Threading.Channels;
using Corvus.Api.Data;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

public interface IActivityLogService
{
    void Log(string actor, string actionType, string category, string targetResource, string? detailsJson = null, string? ipAddress = null);
    Task FlushAsync();
}

public class ActivityLogService : IActivityLogService, IDisposable
{
    private readonly Channel<ActivityLogEntry> _channel;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ActivityLogService> _logger;
    private readonly CancellationTokenSource _cts = new();
    private readonly Task _processingTask;

    public ActivityLogService(IServiceProvider serviceProvider, ILogger<ActivityLogService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        // Sıfır bloklama için sınırlandırılmış kanal (BoundedChannel)
        _channel = Channel.CreateBounded<ActivityLogEntry>(new BoundedChannelOptions(1000)
        {
            FullMode = BoundedChannelFullMode.DropOldest
        });

        _processingTask = Task.Run(ProcessQueueAsync);
    }

    public void Log(string actor, string actionType, string category, string targetResource, string? detailsJson = null, string? ipAddress = null)
    {
        var entry = new ActivityLogEntry
        {
            Id = Guid.NewGuid().ToString(),
            ActorUsername = string.IsNullOrWhiteSpace(actor) ? "system" : actor.Trim(),
            ActionType = actionType.Trim(),
            Category = string.IsNullOrWhiteSpace(category) ? "system" : category.Trim().ToLowerInvariant(),
            TargetResource = targetResource.Trim(),
            DetailsJson = detailsJson,
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow
        };

        _channel.Writer.TryWrite(entry);
    }

    private async Task ProcessQueueAsync()
    {
        var buffer = new List<ActivityLogEntry>(32);

        while (!_cts.Token.IsCancellationRequested)
        {
            try
            {
                if (await _channel.Reader.WaitToReadAsync(_cts.Token))
                {
                    while (buffer.Count < 32 && _channel.Reader.TryRead(out var item))
                    {
                        buffer.Add(item);
                    }

                    if (buffer.Count > 0)
                    {
                        using var scope = _serviceProvider.CreateScope();
                        var repo = scope.ServiceProvider.GetRequiredService<IActivityLogRepository>();
                        await repo.InsertBatchAsync(buffer);
                        buffer.Clear();
                    }
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Activity logları veritabanına yazılırken hata oluştu.");
                buffer.Clear();
                await Task.Delay(1000, _cts.Token);
            }
        }
    }

    public async Task FlushAsync()
    {
        var buffer = new List<ActivityLogEntry>();
        while (_channel.Reader.TryRead(out var item))
        {
            buffer.Add(item);
        }

        if (buffer.Count > 0)
        {
            using var scope = _serviceProvider.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IActivityLogRepository>();
            await repo.InsertBatchAsync(buffer);
        }
    }

    public void Dispose()
    {
        _cts.Cancel();
        _channel.Writer.TryComplete();
        try
        {
            _processingTask.Wait(TimeSpan.FromSeconds(2));
        }
        catch { }
        _cts.Dispose();
    }
}
