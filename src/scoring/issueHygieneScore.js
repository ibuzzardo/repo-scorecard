const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function median(values) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

export function scoreIssueHygiene(issues) {
  const openIssues = issues?.open || [];
  const closedIssues = issues?.closed || [];
  const repoLabels = issues?.labels || [];

  const openCount = openIssues.length;
  const closedCount = closedIssues.length;
  const ratio = openCount / Math.max(1, closedCount);

  const now = Date.now();
  const openAges = openIssues.map((issue) => {
    const createdAt = new Date(issue.created_at).getTime();
    if (!Number.isFinite(createdAt)) {
      return 365;
    }
    return Math.max(0, (now - createdAt) / DAY_MS);
  });

  const medianOpenAgeDays = median(openAges);
  const labeledOpenCount = openIssues.filter((issue) => (issue.labels || []).length > 0).length;
  const labelCoverage = openCount > 0 ? labeledOpenCount / openCount : 1;

  const ratioPoints = clamp(1 - ratio / 2, 0, 1) * 40;
  const agePoints = clamp(1 - medianOpenAgeDays / 180, 0, 1) * 35;
  const labelPoints = (repoLabels.length > 0 ? 10 : 0) + labelCoverage * 15;

  const score = Math.round(ratioPoints + agePoints + labelPoints);

  return {
    score,
    rationale: [
      `${openCount} open issue(s), ${closedCount} closed issue(s) (open/closed ratio ${ratio.toFixed(2)}).`,
      `Median age of open issues: ${medianOpenAgeDays.toFixed(1)} days.`,
      `Open issue label coverage: ${(labelCoverage * 100).toFixed(1)}% (${repoLabels.length} label(s) defined).`,
    ],
    metrics: {
      openCount,
      closedCount,
      ratio,
      medianOpenAgeDays,
      labelCoverage,
      labelCount: repoLabels.length,
    },
  };
}
