using System.IO;
using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;
using Corvus.Api.Models;

namespace Corvus.Api.Services.Docker;

public class DockerExecClient
{
    private readonly IDockerHttpTransport _transport;
    private readonly ILogger<DockerHttpClient> _logger;

    public DockerExecClient(IDockerHttpTransport transport, ILogger<DockerHttpClient> logger)
    {
        _transport = transport;
        _logger = logger;
    }

    public async Task<string?> CreateExecInstanceAsync(string containerId, string shell = "/bin/sh", CancellationToken cancellationToken = default)
    {
        try
        {
            string jsonBody = $$"""
            {
              "AttachStdin": true,
              "AttachStdout": true,
              "AttachStderr": true,
              "Tty": true,
              "Env": ["TERM=xterm-256color"],
              "Cmd": [{{JsonSerializer.Serialize(shell, CorvusJsonSerializerContext.Default.String)}}]
            }
            """;

            using var content = new StringContent(jsonBody, Encoding.UTF8, new MediaTypeHeaderValue("application/json"));
            using var response = await _transport.HttpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/exec", content, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                string err = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("Docker exec instance oluşturulamadı: {StatusCode} - {Error}", response.StatusCode, err);
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var res = await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerExecCreateResponse, cancellationToken);
            return res?.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker exec instance oluşturulurken hata: {ContainerId}", containerId);
            return null;
        }
    }

    public async Task<Stream> StartExecStreamAsync(string execId, CancellationToken cancellationToken = default)
    {
        var rawStream = await _transport.CreateRawDockerStreamAsync(cancellationToken);

        const string jsonBody = "{\"Detach\":false,\"Tty\":true}";
        byte[] bodyBytes = Encoding.UTF8.GetBytes(jsonBody);

        string request = $"POST /exec/{Uri.EscapeDataString(execId)}/start HTTP/1.1\r\n" +
                         "Host: localhost\r\n" +
                         "User-Agent: Corvus\r\n" +
                         "Content-Type: application/json\r\n" +
                         "Connection: Upgrade\r\n" +
                         "Upgrade: tcp\r\n" +
                         $"Content-Length: {bodyBytes.Length}\r\n\r\n" +
                         jsonBody;

        byte[] requestBytes = Encoding.UTF8.GetBytes(request);
        await rawStream.WriteAsync(requestBytes, cancellationToken);
        await rawStream.FlushAsync(cancellationToken);

        using var headerMs = new MemoryStream();
        int matched = 0;
        byte[] matchSequence = "\r\n\r\n"u8.ToArray();
        byte[] singleByte = new byte[1];

        while (matched < matchSequence.Length)
        {
            int read = await rawStream.ReadAsync(singleByte, 0, 1, cancellationToken);
            if (read == 0)
            {
                rawStream.Dispose();
                throw new InvalidOperationException("Docker daemon exec bağlantısını erken kapattı.");
            }

            headerMs.WriteByte(singleByte[0]);

            if (singleByte[0] == matchSequence[matched])
            {
                matched++;
            }
            else
            {
                matched = singleByte[0] == matchSequence[0] ? 1 : 0;
            }
        }

        string headerText = Encoding.ASCII.GetString(headerMs.ToArray());
        var firstLine = headerText.Split("\r\n", StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "";
        if (!firstLine.Contains(" 101 ") && !firstLine.Contains(" 200 "))
        {
            rawStream.Dispose();
            throw new InvalidOperationException($"Docker exec stream başlatılamadı: {firstLine}");
        }

        return rawStream;
    }

    public async Task<bool> ResizeExecAsync(string execId, int width, int height, CancellationToken cancellationToken = default)
    {
        try
        {
            string url = $"/exec/{Uri.EscapeDataString(execId)}/resize?h={height}&w={width}";
            using var response = await _transport.HttpClient.PostAsync(url, null, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Docker exec resize başarısız: {ExecId}", execId);
            return false;
        }
    }
}
