using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Corvus.Agent.Models;

namespace Corvus.Agent.Services;

// Unix soket üzerinden ham Docker HTTP iletişimi, yanıt gövdesi ayrıştırma ve çoklanmış log akışı çözümleme
public partial class AgentDockerClient
{
    private async Task<string> SendDockerHttpAsync(string method, string path, CancellationToken ct)
    {
        byte[] rawBody = await SendDockerHttpRawAsync(method, path, ct);
        return Encoding.UTF8.GetString(rawBody);
    }

    private async Task<byte[]> SendDockerHttpRawAsync(string method, string path, CancellationToken ct)
    {
        if (path.Contains('\r') || path.Contains('\n') || method.Contains('\r') || method.Contains('\n'))
        {
            throw new ArgumentException("CRLF injection detected in HTTP request.");
        }

        using var socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);
        var endpoint = new UnixDomainSocketEndPoint(_socketPath);
        await socket.ConnectAsync(endpoint, ct);

        string request = $"{method} {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n";
        byte[] reqBytes = Encoding.UTF8.GetBytes(request);
        await socket.SendAsync(reqBytes, SocketFlags.None, ct);

        using var ms = new MemoryStream();
        var buffer = new byte[8192];
        int bytesRead;

        while ((bytesRead = await socket.ReceiveAsync(buffer, SocketFlags.None, ct)) > 0)
        {
            ms.Write(buffer, 0, bytesRead);
        }

        byte[] allBytes = ms.ToArray();
        return ExtractHttpResponseBody(allBytes);
    }

    private static byte[] ExtractHttpResponseBody(byte[] allBytes)
    {
        // Find CRLF CRLF header-body separator
        int headerEnd = -1;
        for (int i = 0; i <= allBytes.Length - 4; i++)
        {
            if (allBytes[i] == (byte)'\r' &&
                allBytes[i + 1] == (byte)'\n' &&
                allBytes[i + 2] == (byte)'\r' &&
                allBytes[i + 3] == (byte)'\n')
            {
                headerEnd = i + 4;
                break;
            }
        }

        if (headerEnd < 0) return allBytes;

        string headerText = Encoding.ASCII.GetString(allBytes, 0, headerEnd);
        bool isChunked = headerText.IndexOf("Transfer-Encoding: chunked", StringComparison.OrdinalIgnoreCase) >= 0;

        ReadOnlySpan<byte> bodySpan = allBytes.AsSpan(headerEnd);

        if (!isChunked)
        {
            return bodySpan.ToArray();
        }

        // Parse HTTP/1.1 chunked transfer encoding
        using var unchunked = new MemoryStream();
        int offset = 0;

        while (offset < bodySpan.Length)
        {
            // Find CRLF of chunk size line
            int lineEnd = -1;
            for (int i = offset; i <= bodySpan.Length - 2; i++)
            {
                if (bodySpan[i] == (byte)'\r' && bodySpan[i + 1] == (byte)'\n')
                {
                    lineEnd = i;
                    break;
                }
            }

            if (lineEnd < 0) break;

            string chunkSizeHex = Encoding.ASCII.GetString(bodySpan.Slice(offset, lineEnd - offset)).Trim();
            // Ignore chunk extensions if present (e.g., "1a;ext=val")
            int semi = chunkSizeHex.IndexOf(';');
            if (semi >= 0) chunkSizeHex = chunkSizeHex[..semi].Trim();

            if (!int.TryParse(chunkSizeHex, System.Globalization.NumberStyles.HexNumber, null, out int chunkSize) || chunkSize < 0)
            {
                break;
            }

            if (chunkSize == 0)
            {
                // Last chunk
                break;
            }

            int chunkDataStart = lineEnd + 2;
            if (chunkDataStart + chunkSize > bodySpan.Length)
            {
                // Incomplete chunk
                int remaining = bodySpan.Length - chunkDataStart;
                if (remaining > 0)
                {
                    unchunked.Write(bodySpan.Slice(chunkDataStart, remaining));
                }
                break;
            }

            unchunked.Write(bodySpan.Slice(chunkDataStart, chunkSize));
            offset = chunkDataStart + chunkSize + 2; // skip trailing \r\n
        }

        return unchunked.ToArray();
    }

    private static List<string> DemuxDockerStream(ReadOnlySpan<byte> buffer)
    {
        var lines = new List<string>();
        int offset = 0;
        bool detectedMultiplexed = false;

        while (offset + 8 <= buffer.Length)
        {
            byte streamType = buffer[offset];
            byte b1 = buffer[offset + 1];
            byte b2 = buffer[offset + 2];
            byte b3 = buffer[offset + 3];

            // Docker 8-byte frame header (streamType: 1=stdout, 2=stderr)
            if ((streamType == 1 || streamType == 2) && b1 == 0 && b2 == 0 && b3 == 0)
            {
                int payloadSize = System.Buffers.Binary.BinaryPrimitives.ReadInt32BigEndian(buffer.Slice(offset + 4, 4));

                if (payloadSize >= 0 && offset + 8 + payloadSize <= buffer.Length)
                {
                    detectedMultiplexed = true;
                    var payloadSpan = buffer.Slice(offset + 8, payloadSize);
                    string text = Encoding.UTF8.GetString(payloadSpan);
                    using var reader = new StringReader(text);
                    string? line;
                    while ((line = reader.ReadLine()) != null)
                    {
                        if (!string.IsNullOrWhiteSpace(line))
                        {
                            lines.Add(line);
                        }
                    }
                    offset += 8 + payloadSize;
                    continue;
                }
            }

            break;
        }

        if (!detectedMultiplexed && buffer.Length > 0)
        {
            string raw = Encoding.UTF8.GetString(buffer);
            using var reader = new StringReader(raw);
            string? line;
            while ((line = reader.ReadLine()) != null)
            {
                if (!string.IsNullOrWhiteSpace(line))
                {
                    lines.Add(line);
                }
            }
        }

        return lines;
    }
}
