using System.Net.Http;
using System.Text;
using Corvus.Api.Utils;
using Xunit;

namespace Corvus.Api.Tests;

public class HttpBodyValidatorTests
{
    [Fact]
    public void IsMatch_NullOrWhitespace_ReturnsTrue()
    {
        Assert.True(HttpBodyValidator.IsMatch("some payload", null));
        Assert.True(HttpBodyValidator.IsMatch("some payload", ""));
        Assert.True(HttpBodyValidator.IsMatch("some payload", "   "));
    }

    [Theory]
    [InlineData("{\"status\":\"healthy\",\"uptime\":100}", "healthy", true)]
    [InlineData("{\"status\":\"HEALTHY\",\"uptime\":100}", "healthy", true)]
    [InlineData("{\"status\":\"healthy\",\"uptime\":100}", "HEALTHY", true)]
    [InlineData("System is Operational", "operational", true)]
    [InlineData("Error 500: Database down", "healthy", false)]
    [InlineData("{\"code\":404}", "success", false)]
    public void IsMatch_KeywordMatching_MatchesCorrectly(string body, string pattern, bool expected)
    {
        Assert.Equal(expected, HttpBodyValidator.IsMatch(body, pattern));
    }

    [Theory]
    [InlineData("{\"version\":\"1.5.19\",\"ok\":true}", @"""version"":\s*""[0-9]+\.[0-9]+\.[0-9]+""", true)]
    [InlineData("Current ping: 42ms", @"ping:\s*\d+ms", true)]
    [InlineData("status: failed", @"status:\s*(healthy|ok)", false)]
    [InlineData("status: healthy", @"status:\s*(healthy|ok)", true)]
    public void IsMatch_RegexMatching_MatchesCorrectly(string body, string pattern, bool expected)
    {
        Assert.Equal(expected, HttpBodyValidator.IsMatch(body, pattern));
    }

    [Fact]
    public void IsMatch_MalformedRegex_DoesNotThrowAndFallsBackToKeyword()
    {
        // '[' tek başına geçersiz bir regex'tir ancak düz metin olarak arandığında bulunmalıdır
        string body = "Logs: [system-ready] started";
        Assert.True(HttpBodyValidator.IsMatch(body, "[system-ready]"));
    }

    [Fact]
    public async Task ValidateAsync_ValidContent_ReturnsSuccess()
    {
        using var content = new StringContent("{\"status\":\"healthy\",\"app\":\"corvus\"}", Encoding.UTF8, "application/json");
        var (success, error) = await HttpBodyValidator.ValidateAsync(content, "healthy");

        Assert.True(success);
        Assert.Null(error);
    }

    [Fact]
    public async Task ValidateAsync_MissingKeyword_ReturnsFailureWithDescription()
    {
        using var content = new StringContent("{\"status\":\"degraded\"}", Encoding.UTF8, "application/json");
        var (success, error) = await HttpBodyValidator.ValidateAsync(content, "healthy");

        Assert.False(success);
        Assert.NotNull(error);
        Assert.Contains("healthy", error);
    }

    [Fact]
    public async Task ValidateAsync_CappedAt64KB_EnforcesMemoryLimit()
    {
        // 80 KB boyutunda bir yük oluştur (65536 baytı aşan)
        var chunk = new string('A', 1024); // 1 KB
        var sb = new StringBuilder();
        for (int i = 0; i < 70; i++)
        {
            sb.Append(chunk);
        }
        sb.Append("HIDDEN_KEYWORD_BEYOND_64KB");

        using var content = new StringContent(sb.ToString(), Encoding.UTF8, "text/plain");

        // 64 KB sınırını aştığı için bu kelime taranan buffer içinde olmamalıdır
        var (success, error) = await HttpBodyValidator.ValidateAsync(content, "HIDDEN_KEYWORD_BEYOND_64KB");
        Assert.False(success);
        Assert.NotNull(error);

        // Ancak ilk 64 KB içinde olan 'AAAA' başarıyla eşleşmelidir
        using var content2 = new StringContent(sb.ToString(), Encoding.UTF8, "text/plain");
        var (success2, error2) = await HttpBodyValidator.ValidateAsync(content2, "AAAA");
        Assert.True(success2);
        Assert.Null(error2);
    }
}
