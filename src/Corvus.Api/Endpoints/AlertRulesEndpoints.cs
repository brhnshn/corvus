using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class AlertRulesEndpoints
{
    public static void MapAlertRulesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/alerts/rules")
            .AddEndpointFilter<CorvusAuthFilter>();

        // Kuralları listele
        group.MapGet("/", async (IAlertRuleRepository repo) =>
        {
            var rules = await repo.GetAllRulesAsync();
            return Results.Ok(rules);
        });

        // Tekil kural getir
        group.MapGet("/{id}", async (string id, IAlertRuleRepository repo) =>
        {
            var rule = await repo.GetRuleByIdAsync(id);
            return rule != null ? Results.Ok(rule) : Results.NotFound();
        });

        // Yeni kural oluştur (Admin zorunlu)
        group.MapPost("/", [RequireAdmin] async (CreateAlertRuleRequest req, IAlertRuleRepository repo) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name))
            {
                return Results.BadRequest(new { error = "Kural adı boş olamaz." });
            }

            var rule = new AlertRule
            {
                Id = Guid.NewGuid().ToString(),
                Name = req.Name.Trim(),
                TargetType = string.IsNullOrWhiteSpace(req.TargetType) ? "system" : req.TargetType.Trim().ToLowerInvariant(),
                TargetId = req.TargetId?.Trim(),
                Metric = string.IsNullOrWhiteSpace(req.Metric) ? "cpu" : req.Metric.Trim().ToLowerInvariant(),
                Operator = string.IsNullOrWhiteSpace(req.Operator) ? "gt" : req.Operator.Trim().ToLowerInvariant(),
                ThresholdValue = req.ThresholdValue,
                DurationSeconds = req.DurationSeconds > 0 ? req.DurationSeconds : 60,
                CooldownMinutes = req.CooldownMinutes > 0 ? req.CooldownMinutes : 30,
                IsEnabled = req.IsEnabled,
                IsFiring = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await repo.CreateRuleAsync(rule);
            return Results.Created($"/api/alerts/rules/{rule.Id}", rule);
        });

        // Kural güncelle (Admin zorunlu)
        group.MapPut("/{id}", [RequireAdmin] async (string id, UpdateAlertRuleRequest req, IAlertRuleRepository repo) =>
        {
            var existing = await repo.GetRuleByIdAsync(id);
            if (existing == null)
            {
                return Results.NotFound(new { error = "Kural bulunamadı." });
            }

            if (string.IsNullOrWhiteSpace(req.Name))
            {
                return Results.BadRequest(new { error = "Kural adı boş olamaz." });
            }

            existing.Name = req.Name.Trim();
            existing.TargetType = string.IsNullOrWhiteSpace(req.TargetType) ? "system" : req.TargetType.Trim().ToLowerInvariant();
            existing.TargetId = req.TargetId?.Trim();
            existing.Metric = string.IsNullOrWhiteSpace(req.Metric) ? "cpu" : req.Metric.Trim().ToLowerInvariant();
            existing.Operator = string.IsNullOrWhiteSpace(req.Operator) ? "gt" : req.Operator.Trim().ToLowerInvariant();
            existing.ThresholdValue = req.ThresholdValue;
            existing.DurationSeconds = req.DurationSeconds > 0 ? req.DurationSeconds : 60;
            existing.CooldownMinutes = req.CooldownMinutes > 0 ? req.CooldownMinutes : 30;
            existing.IsEnabled = req.IsEnabled;
            existing.UpdatedAt = DateTime.UtcNow;

            await repo.UpdateRuleAsync(existing);
            return Results.Ok(existing);
        });

        // Kural sil (Admin zorunlu)
        group.MapDelete("/{id}", [RequireAdmin] async (string id, IAlertRuleRepository repo) =>
        {
            var existing = await repo.GetRuleByIdAsync(id);
            if (existing == null)
            {
                return Results.NotFound(new { error = "Kural bulunamadı." });
            }

            await repo.DeleteRuleAsync(id);
            return Results.Ok(new { success = true });
        });
    }
}
