using Corvus.Api.Services;
using Xunit;

namespace Corvus.Api.Tests;

public class FlappingDetectorTests
{
    [Fact]
    public void Evaluate_UnderThreshold_ReturnsNormal()
    {
        var detector = new FlappingDetector();
        var now = DateTime.UtcNow;
        string id = "svc-1";

        // Check 1: UP
        var d1 = detector.Evaluate(id, "up", now, threshold: 4);
        Assert.Equal(FlappingDecision.Normal, d1);

        // Check 2: DOWN (Transition 1)
        var d2 = detector.Evaluate(id, "down", now.AddSeconds(10), threshold: 4);
        Assert.Equal(FlappingDecision.Normal, d2);

        // Check 3: UP (Transition 2)
        var d3 = detector.Evaluate(id, "up", now.AddSeconds(20), threshold: 4);
        Assert.Equal(FlappingDecision.Normal, d3);

        // Check 4: DOWN (Transition 3)
        var d4 = detector.Evaluate(id, "down", now.AddSeconds(30), threshold: 4);
        Assert.Equal(FlappingDecision.Normal, d4);
        Assert.False(detector.IsFlapping(id));
    }

    [Fact]
    public void Evaluate_ReachingThreshold_ReturnsFlappingStarted()
    {
        var detector = new FlappingDetector();
        var now = DateTime.UtcNow;
        string id = "svc-2";

        detector.Evaluate(id, "up", now, threshold: 4);
        detector.Evaluate(id, "down", now.AddSeconds(10), threshold: 4); // 1
        detector.Evaluate(id, "up", now.AddSeconds(20), threshold: 4);   // 2
        detector.Evaluate(id, "down", now.AddSeconds(30), threshold: 4); // 3

        // Transition 4 -> Triggers flapping!
        var d5 = detector.Evaluate(id, "up", now.AddSeconds(40), threshold: 4);
        Assert.Equal(FlappingDecision.FlappingStarted, d5);
        Assert.True(detector.IsFlapping(id));
    }

    [Fact]
    public void Evaluate_WhileFlapping_SuppressesOscillations()
    {
        var detector = new FlappingDetector();
        var now = DateTime.UtcNow;
        string id = "svc-3";

        // Enter flapping
        detector.Evaluate(id, "up", now, threshold: 3);
        detector.Evaluate(id, "down", now.AddSeconds(10), threshold: 3); // 1
        detector.Evaluate(id, "up", now.AddSeconds(20), threshold: 3);   // 2
        var started = detector.Evaluate(id, "down", now.AddSeconds(30), threshold: 3); // 3
        Assert.Equal(FlappingDecision.FlappingStarted, started);

        // Rapid oscillations while flapping
        var sup1 = detector.Evaluate(id, "up", now.AddSeconds(40), threshold: 3, recoveryChecks: 3);
        Assert.Equal(FlappingDecision.Suppressed, sup1);

        var sup2 = detector.Evaluate(id, "down", now.AddSeconds(50), threshold: 3, recoveryChecks: 3);
        Assert.Equal(FlappingDecision.Suppressed, sup2);

        var sup3 = detector.Evaluate(id, "up", now.AddSeconds(60), threshold: 3, recoveryChecks: 3);
        Assert.Equal(FlappingDecision.Suppressed, sup3);

        Assert.True(detector.IsFlapping(id));
    }

    [Fact]
    public void Evaluate_AfterConsecutiveStableChecks_ReturnsFlappingRecovered()
    {
        var detector = new FlappingDetector();
        var now = DateTime.UtcNow;
        string id = "svc-4";

        // Enter flapping (threshold 2)
        detector.Evaluate(id, "up", now, threshold: 2);
        detector.Evaluate(id, "down", now.AddSeconds(10), threshold: 2); // 1
        detector.Evaluate(id, "up", now.AddSeconds(20), threshold: 2);   // 2 -> FlappingStarted

        // Stable checks: need 3 consecutive checks in same status
        var c1 = detector.Evaluate(id, "up", now.AddSeconds(30), threshold: 2, recoveryChecks: 3);
        Assert.Equal(FlappingDecision.Suppressed, c1);

        var c2 = detector.Evaluate(id, "up", now.AddSeconds(40), threshold: 2, recoveryChecks: 3);
        Assert.Equal(FlappingDecision.Suppressed, c2);

        // 3rd consecutive stable check -> Recovered!
        var c3 = detector.Evaluate(id, "up", now.AddSeconds(50), threshold: 2, recoveryChecks: 3);
        Assert.Equal(FlappingDecision.FlappingRecovered, c3);
        Assert.False(detector.IsFlapping(id));
    }

    [Fact]
    public void Evaluate_TenRapidTransitions_OnlyAlertsInitialFlappingAndFinalRecovery()
    {
        // ROADMAP Acceptance Test:
        // Peş peşe 10 durum değişiminde yalnızca eşik öncesi, ilk flapping ve kararlı duruma ulaşıldığında bildirim gider.
        var detector = new FlappingDetector();
        var now = DateTime.UtcNow;
        string id = "svc-flapping-10";
        int threshold = 3;
        int recoveryChecks = 3;

        var decisions = new List<FlappingDecision>();

        // 10 rapid transitions: up -> down -> up -> down ...
        string status = "up";
        decisions.Add(detector.Evaluate(id, status, now, threshold: threshold, recoveryChecks: recoveryChecks));

        for (int i = 1; i <= 10; i++)
        {
            status = status == "up" ? "down" : "up";
            var dec = detector.Evaluate(id, status, now.AddSeconds(i * 10), threshold: threshold, recoveryChecks: recoveryChecks);
            decisions.Add(dec);
        }

        // Decisions breakdown:
        // 0: Initial UP -> Normal
        // 1: DOWN (t=1) -> Normal
        // 2: UP (t=2) -> Normal
        // 3: DOWN (t=3) -> FlappingStarted!
        // 4..10: rapid transitions -> All Suppressed!
        Assert.Equal(FlappingDecision.FlappingStarted, decisions[3]);
        for (int i = 4; i <= 10; i++)
        {
            Assert.Equal(FlappingDecision.Suppressed, decisions[i]);
        }

        // Now service stabilizes in the current status
        // i=10 was the 1st check in that status.
        // s1 is the 2nd consecutive check in that status (Suppressed).
        // s2 is the 3rd consecutive check in that status (FlappingRecovered).
        var s1 = detector.Evaluate(id, status, now.AddSeconds(110), threshold: threshold, recoveryChecks: recoveryChecks);
        var s2 = detector.Evaluate(id, status, now.AddSeconds(120), threshold: threshold, recoveryChecks: recoveryChecks);

        Assert.Equal(FlappingDecision.Suppressed, s1);
        Assert.Equal(FlappingDecision.FlappingRecovered, s2);
        Assert.False(detector.IsFlapping(id));
    }

    [Fact]
    public void Evaluate_WhenDisabled_AlwaysReturnsNormal()
    {
        var detector = new FlappingDetector();
        var now = DateTime.UtcNow;
        string id = "svc-disabled";

        for (int i = 0; i < 20; i++)
        {
            string status = i % 2 == 0 ? "up" : "down";
            var dec = detector.Evaluate(id, status, now.AddSeconds(i * 5), isEnabled: false, threshold: 2);
            Assert.Equal(FlappingDecision.Normal, dec);
        }

        Assert.False(detector.IsFlapping(id));
    }

    [Fact]
    public void Reset_ClearsServiceState()
    {
        var detector = new FlappingDetector();
        var now = DateTime.UtcNow;
        string id = "svc-reset";

        detector.Evaluate(id, "up", now, threshold: 2);
        detector.Evaluate(id, "down", now.AddSeconds(10), threshold: 2);
        detector.Evaluate(id, "up", now.AddSeconds(20), threshold: 2);
        Assert.True(detector.IsFlapping(id));

        detector.Reset(id);
        Assert.False(detector.IsFlapping(id));
    }
}
