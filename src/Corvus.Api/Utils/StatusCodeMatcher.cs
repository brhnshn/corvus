namespace Corvus.Api.Utils;

public static class StatusCodeMatcher
{
    /// <summary>
    /// Checks whether an HTTP status code matches the accepted pattern.
    /// Supports single codes (e.g. 200), ranges (e.g. 200-299), and comma-separated lists (e.g. "200-299, 301, 302").
    /// Defaults to 200-299 if pattern is null or empty.
    /// </summary>
    public static bool IsMatch(int statusCode, string? pattern)
    {
        if (string.IsNullOrWhiteSpace(pattern))
        {
            return statusCode >= 200 && statusCode <= 299;
        }

        var parts = pattern.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length == 0)
        {
            return false;
        }

        foreach (var rawPart in parts)
        {
            var part = rawPart.Trim();
            if (part.Contains('-'))
            {
                var rangeParts = part.Split('-', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (rangeParts.Length == 2 &&
                    int.TryParse(rangeParts[0], out int start) &&
                    int.TryParse(rangeParts[1], out int end))
                {
                    int min = Math.Min(start, end);
                    int max = Math.Max(start, end);
                    if (statusCode >= min && statusCode <= max)
                    {
                        return true;
                    }
                }
            }
            else if (int.TryParse(part, out int code))
            {
                if (statusCode == code)
                {
                    return true;
                }
            }
        }

        return false;
    }
}
