function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const SEMVER_REGEX = /^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

export function scoreReleaseMaturity(releaseData) {
  const releases = releaseData?.releases || [];
  const tags = releaseData?.tags || [];

  const releaseCount = releases.length;
  const tagCount = tags.length;

  const hasReleasesOrTags = releaseCount > 0 || tagCount > 0;
  const presencePoints = hasReleasesOrTags ? (releaseCount > 0 ? 30 : 20) : 0;

  const semverCandidates = [
    ...releases.map((release) => release.tag_name || release.name || ""),
    ...tags.map((tag) => tag.name || ""),
  ].filter(Boolean);

  const semverMatches = semverCandidates.filter((value) => SEMVER_REGEX.test(value));
  const semverRatio = semverCandidates.length > 0 ? semverMatches.length / semverCandidates.length : 0;
  const semverPoints = semverRatio * 40;

  const now = Date.now();
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
  const releasesLastYear = releases.filter((release) => {
    const publishedAt = release.published_at ? new Date(release.published_at).getTime() : 0;
    return publishedAt >= oneYearAgo;
  }).length;
  const cadencePoints = clamp(releasesLastYear / 12, 0, 1) * 30;

  const score = Math.round(presencePoints + semverPoints + cadencePoints);

  return {
    score,
    rationale: [
      `Detected ${releaseCount} release(s) and ${tagCount} tag(s).`,
      `Semantic version coverage: ${(semverRatio * 100).toFixed(1)}%.`,
      `${releasesLastYear} release(s) published in the last 12 months.`,
    ],
    metrics: {
      releaseCount,
      tagCount,
      semverRatio,
      releasesLastYear,
    },
  };
}
