using Corvus.Api.BackgroundServices;
using Corvus.Api.Data;
using Corvus.Api.Endpoints;
using Corvus.Api.Models;
using Corvus.Api.Services;

[module: Dapper.DapperAot]

var builder = WebApplication.CreateSlimBuilder(args);

// Port ayarı (CORVUS_PORT veya varsayılan 8090)
string port = Environment.GetEnvironmentVariable("CORVUS_PORT") ?? "8090";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// JSON AOT Source Generator yapılandırması
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, CorvusJsonSerializerContext.Default);
});

// HTTP Client & Bağımlılık Enjeksiyonu
builder.Services.AddHttpClient();
builder.Services.AddSingleton<IDbConnectionFactory, DbConnectionFactory>();
builder.Services.AddScoped<IServicesRepository, ServicesRepository>();
builder.Services.AddScoped<IMetricsRepository, MetricsRepository>();
builder.Services.AddScoped<IUptimeRepository, UptimeRepository>();
builder.Services.AddScoped<IBackupRepository, BackupRepository>();
builder.Services.AddScoped<IPushMonitorRepository, PushMonitorRepository>();
builder.Services.AddScoped<IIncidentRepository, IncidentRepository>();
builder.Services.AddSingleton<ISettingsRepository, SettingsRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddSingleton<ISessionRepository, SessionRepository>();
builder.Services.AddScoped<IAlertRuleRepository, AlertRuleRepository>();
builder.Services.AddScoped<IActivityLogRepository, ActivityLogRepository>();

builder.Services.AddSingleton<IDockerHttpClient, DockerHttpClient>();
builder.Services.AddSingleton<IDockerService, DockerService>();
builder.Services.AddSingleton<IAuthService, AuthService>();
builder.Services.AddSingleton<CorvusAuthFilter>();
builder.Services.AddSingleton<Corvus.Api.Services.Notifications.IDiscordChannelSender, Corvus.Api.Services.Notifications.DiscordChannelSender>();
builder.Services.AddSingleton<Corvus.Api.Services.Notifications.ITelegramChannelSender, Corvus.Api.Services.Notifications.TelegramChannelSender>();
builder.Services.AddSingleton<Corvus.Api.Services.Notifications.INtfyChannelSender, Corvus.Api.Services.Notifications.NtfyChannelSender>();
builder.Services.AddSingleton<Corvus.Api.Services.Notifications.IWebhookChannelSender, Corvus.Api.Services.Notifications.WebhookChannelSender>();
builder.Services.AddSingleton<Corvus.Api.Services.Notifications.ISlackChannelSender, Corvus.Api.Services.Notifications.SlackChannelSender>();
builder.Services.AddSingleton<Corvus.Api.Services.Notifications.ISmtpChannelSender, Corvus.Api.Services.Notifications.SmtpChannelSender>();
builder.Services.AddSingleton<INotificationService, NotificationService>();
builder.Services.AddSingleton<IFlappingDetector, FlappingDetector>();
builder.Services.AddSingleton<IEventBroadcaster, EventBroadcaster>();
builder.Services.AddSingleton<IUpdateCheckerService, UpdateCheckerService>();
builder.Services.AddSingleton<IOciRegistryClient, OciRegistryClient>();
builder.Services.AddSingleton<IComposeFileService, ComposeFileService>();
builder.Services.AddSingleton<IAutoHealingService, AutoHealingService>();
builder.Services.AddSingleton<IActivityLogService, ActivityLogService>();

// Arka Plan Servisleri
builder.Services.AddHostedService<ContainerDiscoveryService>();
builder.Services.AddHostedService<SystemMetricsCollector>();
builder.Services.AddHostedService<UptimeCheckerService>();
builder.Services.AddHostedService<RetentionCleanupService>();
builder.Services.AddHostedService<MemoryTrimmerBackgroundService>();
builder.Services.AddHostedService<ThresholdEvaluatorService>();

// CORS (Sertleştirilmiş Güvenlik: Geliştirme modu veya CORVUS_ALLOWED_ORIGINS ile kontrollü erişim)
string? allowedOriginsEnv = Environment.GetEnvironmentVariable("CORVUS_ALLOWED_ORIGINS");
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (!string.IsNullOrWhiteSpace(allowedOriginsEnv))
        {
            var origins = allowedOriginsEnv.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            policy.WithOrigins(origins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyHeader()
                  .AllowAnyMethod()
                  .SetIsOriginAllowed(_ => true)
                  .AllowCredentials();
        }
        else
        {
            // Üretimde rastgele origin'lere kimlikli (credentialed) erişim engellenir (Same-origin otomatik çalışır)
            policy.AllowAnyHeader()
                  .AllowAnyMethod();
        }
    });
});

var app = builder.Build();

// Veritabanı otomatik migration çalıştırma
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IDbConnectionFactory>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        DatabaseMigrator.Migrate(db, logger);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Veritabanı migration adımı sırasında kritik hata!");
    }
}

app.UseCors();
app.UseWebSockets();

// Statik Dosyalar (Frontend SPA çıktısı için optimize önbellekleme)
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        // Vite tarafından hash'lenmiş JS/CSS varlıkları için 1 yıllık immutable önbellek
        if (ctx.File.Name.EndsWith(".js", StringComparison.OrdinalIgnoreCase) || 
            ctx.File.Name.EndsWith(".css", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        }
        else if (ctx.File.Name.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        }
    }
});

// Minimal API Endpoint Grupları
app.MapServicesEndpoints();
app.MapContainersEndpoints();
app.MapMetricsEndpoints();
app.MapUptimeEndpoints();
app.MapPushEndpoints();
app.MapAuthEndpoints();
app.MapUsersEndpoints();
app.MapDashboardEndpoints();
app.MapSettingsEndpoints();
app.MapBackupEndpoints();
app.MapStatusPageEndpoints();
app.MapIncidentEndpoints();
app.MapNotificationEndpoints();
app.MapStreamEndpoints();
app.MapComposeEndpoints();
app.MapDeployWebhookEndpoints();
app.MapAlertRulesEndpoints();
app.MapActivityLogEndpoints();

// SPA Routing Fallback (Asla önbelleklenmemeli; her zaman taze chunk hash'lerini döndürür)
app.MapFallbackToFile("index.html", new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate, max-age=0";
        ctx.Context.Response.Headers.Pragma = "no-cache";
        ctx.Context.Response.Headers.Expires = "0";
    }
});

app.Run();
