const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function scoreCiCd(ci) {
  const workflows = ci?.workflows || [];
  const workflowRuns = ci?.workflowRuns || [];

  if (workflows.length === 0) {
    return {
      score: 0,
      rationale: ["No GitHub Actions workflows found."],
      metrics: {
        workflows: 0,
        recentRuns: 0,
        passRate: 0,
      },
    };
  }

  const now = Date.now();
  const recentRuns = workflowRuns.filter((run) => {
    const createdAt = run.created_at ? new Date(run.created_at).getTime() : 0;
    return createdAt > 0 && now - createdAt <= THIRTY_DAYS_MS;
  });

  const completedRuns = recentRuns.filter((run) => run.status === "completed");
  const successfulRuns = completedRuns.filter((run) => run.conclusion === "success");
  const passRate = completedRuns.length > 0 ? successfulRuns.length / completedRuns.length : 0;

  const workflowPoints = 30;
  const runPoints = clamp(recentRuns.length / 10, 0, 1) * 30;
  const passRatePoints = passRate * 40;

  const score = Math.round(workflowPoints + runPoints + passRatePoints);

  return {
    score,
    rationale: [
      `Detected ${workflows.length} workflow file(s).`,
      `${recentRuns.length} workflow run(s) in the last 30 days.`,
      `Pass rate: ${(passRate * 100).toFixed(1)}% over ${completedRuns.length} completed run(s).`,
    ],
    metrics: {
      workflows: workflows.length,
      recentRuns: recentRuns.length,
      passRate,
    },
  };
}
