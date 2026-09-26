using Corvus.Api.Utils;
using Xunit;

namespace Corvus.Api.Tests;

public class StatusCodeMatcherTests
{
    [Theory]
    [InlineData(200, true)]
    [InlineData(204, true)]
    [InlineData(299, true)]
    [InlineData(199, false)]
    [InlineData(300, false)]
    [InlineData(404, false)]
    [InlineData(500, false)]
    public void IsMatch_DefaultPattern_Matches200To299(int statusCode, bool expected)
    {
        Assert.Equal(expected, StatusCodeMatcher.IsMatch(statusCode, null));
        Assert.Equal(expected, StatusCodeMatcher.IsMatch(statusCode, ""));
        Assert.Equal(expected, StatusCodeMatcher.IsMatch(statusCode, "   "));
    }

    [Theory]
    [InlineData(200, "200", true)]
    [InlineData(201, "200", false)]
    [InlineData(404, "404", true)]
    [InlineData(500, "404", false)]
    public void IsMatch_SingleCode_MatchesCorrectly(int statusCode, string pattern, bool expected)
    {
        Assert.Equal(expected, StatusCodeMatcher.IsMatch(statusCode, pattern));
    }

    [Theory]
    [InlineData(200, "200-299", true)]
    [InlineData(250, "200-299", true)]
    [InlineData(299, "200-299", true)]
    [InlineData(300, "200-299", false)]
    [InlineData(199, "200-299", false)]
    public void IsMatch_Range_MatchesCorrectly(int statusCode, string pattern, bool expected)
    {
        Assert.Equal(expected, StatusCodeMatcher.IsMatch(statusCode, pattern));
    }

    [Theory]
    [InlineData(200, "200, 201, 301-308, 401", true)]
    [InlineData(201, "200, 201, 301-308, 401", true)]
    [InlineData(301, "200, 201, 301-308, 401", true)]
    [InlineData(305, "200, 201, 301-308, 401", true)]
    [InlineData(308, "200, 201, 301-308, 401", true)]
    [InlineData(401, "200, 201, 301-308, 401", true)]
    [InlineData(403, "200, 201, 301-308, 401", false)]
    [InlineData(500, "200, 201, 301-308, 401", false)]
    public void IsMatch_ComplexCommaSeparatedWithRanges_MatchesCorrectly(int statusCode, string pattern, bool expected)
    {
        Assert.Equal(expected, StatusCodeMatcher.IsMatch(statusCode, pattern));
    }

    [Fact]
    public void IsMatch_InvertedRange_MatchesCorrectly()
    {
        Assert.True(StatusCodeMatcher.IsMatch(205, "299-200"));
        Assert.False(StatusCodeMatcher.IsMatch(199, "299-200"));
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("200-")]
    [InlineData("-299")]
    [InlineData(",,,")]
    public void IsMatch_MalformedInput_DoesNotThrow(string pattern)
    {
        // Malformed inputs without matching integers should return false gracefully
        Assert.False(StatusCodeMatcher.IsMatch(200, pattern));
    }
}
