import { scoreReadme } from "./readmeScore.js";
import { scoreCiCd } from "./ciCdScore.js";
import { scoreIssueHygiene } from "./issueHygieneScore.js";
import { scoreActivity } from "./activityScore.js";
import { scoreReleaseMaturity } from "./releaseMaturityScore.js";
import { scoreCommunityHealth } from "./communityHealthScore.js";

export const CATEGORY_WEIGHTS = {
  readme: 0.2,
  ciCd: 0.2,
  issueHygiene: 0.15,
  activity: 0.2,
  releaseMaturity: 0.1,
  communityHealth: 0.15,
};

export function scoreToGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function gradeToExitCode(grade) {
  return grade === "A" || grade === "B" || grade === "C" ? 0 : 1;
}

export function buildScorecard(repoRef, data) {
  const readme = scoreReadme(data.readme);
  const ciCd = scoreCiCd(data.ci);
  const issueHygiene = scoreIssueHygiene(data.issues);
  const activity = scoreActivity(data.activity);
  const releaseMaturity = scoreReleaseMaturity(data.releases);
  const communityHealth = scoreCommunityHealth(data.community);

  const categories = [
    {
      id: "readme",
      name: "README Quality",
      weight: CATEGORY_WEIGHTS.readme,
      ...readme,
    },
    {
      id: "ciCd",
      name: "CI/CD Health",
      weight: CATEGORY_WEIGHTS.ciCd,
      ...ciCd,
    },
    {
      id: "issueHygiene",
      name: "Issue Hygiene",
      weight: CATEGORY_WEIGHTS.issueHygiene,
      ...issueHygiene,
    },
    {
      id: "activity",
      name: "Activity Score",
      weight: CATEGORY_WEIGHTS.activity,
      ...activity,
    },
    {
      id: "releaseMaturity",
      name: "Release Maturity",
      weight: CATEGORY_WEIGHTS.releaseMaturity,
      ...releaseMaturity,
    },
    {
      id: "communityHealth",
      name: "Community Health",
      weight: CATEGORY_WEIGHTS.communityHealth,
      ...communityHealth,
    },
  ];

  const overallScoreRaw = categories.reduce((sum, category) => sum + category.score * category.weight, 0);
  const overallScore = Math.round(overallScoreRaw * 10) / 10;
  const grade = scoreToGrade(overallScore);

  return {
    repository: repoRef.fullName || `${repoRef.owner}/${repoRef.repo}`,
    overallScore,
    grade,
    categories,
    generatedAt: new Date().toISOString(),
  };
}
