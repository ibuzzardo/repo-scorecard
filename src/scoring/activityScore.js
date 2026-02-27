const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function scoreActivity(activity) {
  const recentCommits = activity?.recentCommits || [];
  const contributors = activity?.contributors || [];
  const lastCommitDate = activity?.lastCommitDate;

  const commitCount30d = recentCommits.length;
  const contributorCount = contributors.length;

  let lastCommitAgeDays = Infinity;
  if (lastCommitDate) {
    const ts = new Date(lastCommitDate).getTime();
    if (Number.isFinite(ts)) {
      lastCommitAgeDays = Math.max(0, (Date.now() - ts) / DAY_MS);
    }
  }

  const commitPoints = clamp(commitCount30d / 30, 0, 1) * 40;
  const recencyPoints = Number.isFinite(lastCommitAgeDays)
    ? clamp(1 - lastCommitAgeDays / 90, 0, 1) * 35
    : 0;
  const contributorPoints = clamp(contributorCount / 20, 0, 1) * 25;

  const score = Math.round(commitPoints + recencyPoints + contributorPoints);

  return {
    score,
    rationale: [
      `${commitCount30d} commit(s) in the last 30 days.`,
      Number.isFinite(lastCommitAgeDays)
        ? `Last commit was ${lastCommitAgeDays.toFixed(1)} day(s) ago.`
        : "Last commit date unavailable.",
      `${contributorCount} contributor(s) detected.`,
    ],
    metrics: {
      commitCount30d,
      lastCommitAgeDays: Number.isFinite(lastCommitAgeDays) ? lastCommitAgeDays : null,
      contributorCount,
    },
  };
}
