const BADGE_REGEX = /!\[[^\]]*\]\((?:https?:\/\/)?[^)]+\)/g;
const HEADING_REGEX = /^#{1,6}\s+.+/gm;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function scoreReadme(readme) {
  if (!readme?.exists) {
    return {
      score: 0,
      rationale: ["README not found."],
      metrics: {
        exists: false,
        length: 0,
        badgeCount: 0,
        headingCount: 0,
      },
    };
  }

  const content = readme.content || "";
  const length = readme.length || content.length;
  const badgeCount = (content.match(BADGE_REGEX) || []).length;
  const headingCount = (content.match(HEADING_REGEX) || []).length;

  const existsPoints = 25;
  const lengthPoints = clamp(length / 500, 0, 1) * 25;
  const badgePoints = badgeCount > 0 ? 25 : 0;
  const sectionPoints = clamp(headingCount / 3, 0, 1) * 25;

  const score = Math.round(existsPoints + lengthPoints + badgePoints + sectionPoints);

  return {
    score,
    rationale: [
      `README found (${length} characters).`,
      badgeCount > 0 ? `Detected ${badgeCount} badge(s).` : "No badges detected.",
      `Detected ${headingCount} heading(s).`,
    ],
    metrics: {
      exists: true,
      length,
      badgeCount,
      headingCount,
    },
  };
}
