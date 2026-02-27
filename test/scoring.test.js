import { beforeEach, describe, expect, it, vi } from "vitest";
import { scoreReadme } from "../src/scoring/readmeScore.js";
import { scoreCiCd } from "../src/scoring/ciCdScore.js";
import { scoreIssueHygiene } from "../src/scoring/issueHygieneScore.js";
import { scoreActivity } from "../src/scoring/activityScore.js";
import { scoreReleaseMaturity } from "../src/scoring/releaseMaturityScore.js";
import { scoreCommunityHealth } from "../src/scoring/communityHealthScore.js";
import { buildScorecard, gradeToExitCode, scoreToGrade, CATEGORY_WEIGHTS } from "../src/scoring/index.js";

describe("scoring modules", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T00:00:00.000Z"));
  });

  describe("scoreReadme", () => {
    it("returns zero when README is missing", () => {
      const result = scoreReadme({ exists: false });
      expect(result.score).toBe(0);
      expect(result.metrics).toEqual({ exists: false, length: 0, badgeCount: 0, headingCount: 0 });
    });

    it("scores strong README near max with length, headings, and badges", () => {
      const content = [
        "# Title",
        "## Overview",
        "## Setup",
        "## Usage",
        "![build](https://img.shields.io/badge/build-passing-brightgreen)",
        "x".repeat(2500),
      ].join("\n");

      const result = scoreReadme({ exists: true, content, length: content.length });
      expect(result.score).toBe(100);
      expect(result.metrics.badgeCount).toBeGreaterThanOrEqual(1);
      expect(result.metrics.headingCount).toBeGreaterThanOrEqual(3);
    });

    it("uses content length fallback when length is absent", () => {
      const result = scoreReadme({ exists: true, content: "# Title\nsmall" });
      expect(result.metrics.length).toBe("# Title\nsmall".length);
    });
  });

  describe("scoreCiCd", () => {
    it("returns zero with no workflows", () => {
      const result = scoreCiCd({ workflows: [], workflowRuns: [] });
      expect(result.score).toBe(0);
      expect(result.metrics).toEqual({ workflows: 0, recentRuns: 0, passRate: 0 });
    });

    it("gives base points when workflows exist but no recent runs", () => {
      const oldRun = { status: "completed", conclusion: "success", created_at: "2020-01-01T00:00:00.000Z" };
      const result = scoreCiCd({ workflows: [{ id: 1 }], workflowRuns: [oldRun] });

      expect(result.score).toBe(30);
      expect(result.metrics.recentRuns).toBe(0);
    });

    it("scores by recent run volume and pass rate", () => {
      const nowIso = new Date().toISOString();
      const runs = [
        { status: "completed", conclusion: "success", created_at: nowIso },
        { status: "completed", conclusion: "failure", created_at: nowIso },
        { status: "queued", conclusion: null, created_at: nowIso },
      ];

      const result = scoreCiCd({ workflows: [{ id: 1 }], workflowRuns: runs });
      expect(result.metrics.recentRuns).toBe(3);
      expect(result.metrics.passRate).toBeCloseTo(0.5, 5);
      expect(result.score).toBeGreaterThan(40);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe("scoreIssueHygiene", () => {
    it("handles empty issue sets", () => {
      const result = scoreIssueHygiene({ open: [], closed: [], labels: [] });
      expect(result.metrics.openCount).toBe(0);
      expect(result.metrics.closedCount).toBe(0);
      expect(result.metrics.labelCoverage).toBe(1);
      expect(result.score).toBeGreaterThanOrEqual(35);
    });

    it("penalizes stale, unlabeled open issues and bad ratio", () => {
      const old = new Date("2023-01-01T00:00:00.000Z").toISOString();
      const result = scoreIssueHygiene({
        open: [
          { created_at: old, labels: [] },
          { created_at: old, labels: [] },
          { created_at: old, labels: [] },
        ],
        closed: [],
        labels: [],
      });

      expect(result.metrics.ratio).toBe(3);
      expect(result.metrics.medianOpenAgeDays).toBeGreaterThan(180);
      expect(result.metrics.labelCoverage).toBe(0);
      expect(result.score).toBe(0);
    });

    it("treats invalid created_at as very old", () => {
      const result = scoreIssueHygiene({
        open: [{ created_at: "not-a-date", labels: [{ name: "bug" }] }],
        closed: [{ created_at: new Date().toISOString() }],
        labels: [{ name: "bug" }],
      });

      expect(result.metrics.medianOpenAgeDays).toBe(365);
    });
  });

  describe("scoreActivity", () => {
    it("handles missing last commit date", () => {
      const result = scoreActivity({ recentCommits: [], contributors: [], lastCommitDate: null });
      expect(result.metrics.lastCommitAgeDays).toBeNull();
      expect(result.score).toBe(0);
    });

    it("scores commits, recency, and contributors", () => {
      const result = scoreActivity({
        recentCommits: Array.from({ length: 40 }, (_, i) => ({ sha: `sha${i}` })),
        contributors: Array.from({ length: 30 }, (_, i) => ({ id: i + 1 })),
        lastCommitDate: new Date("2026-01-10T00:00:00.000Z").toISOString(),
      });

      expect(result.metrics.commitCount30d).toBe(40);
      expect(result.metrics.contributorCount).toBe(30);
      expect(result.score).toBeGreaterThan(90);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe("scoreReleaseMaturity", () => {
    it("returns zero with no releases and tags", () => {
      const result = scoreReleaseMaturity({ releases: [], tags: [] });
      expect(result.score).toBe(0);
      expect(result.metrics).toEqual({
        releaseCount: 0,
        tagCount: 0,
        semverRatio: 0,
        releasesLastYear: 0,
      });
    });

    it("scores tags-only repositories with semver coverage", () => {
      const result = scoreReleaseMaturity({
        releases: [],
        tags: [{ name: "v1.0.0" }, { name: "alpha" }],
      });

      expect(result.metrics.semverRatio).toBe(0.5);
      expect(result.score).toBe(40);
    });

    it("caps cadence points when releases exceed monthly cadence", () => {
      const releases = Array.from({ length: 20 }, (_, i) => ({
        tag_name: `v1.0.${i}`,
        published_at: new Date("2025-12-01T00:00:00.000Z").toISOString(),
      }));

      const result = scoreReleaseMaturity({ releases, tags: [] });
      expect(result.metrics.releasesLastYear).toBe(20);
      expect(result.score).toBe(100);
    });
  });

  describe("scoreCommunityHealth", () => {
    it("scores binary checks correctly", () => {
      expect(
        scoreCommunityHealth({
          hasLicense: false,
          hasContributing: false,
          hasCodeOfConduct: false,
          hasIssueTemplate: false,
        }).score,
      ).toBe(0);

      expect(
        scoreCommunityHealth({
          hasLicense: true,
          hasContributing: true,
          hasCodeOfConduct: true,
          hasIssueTemplate: true,
        }).score,
      ).toBe(100);
    });
  });

  describe("index helpers", () => {
    it("maps score to grade boundaries", () => {
      expect(scoreToGrade(90)).toBe("A");
      expect(scoreToGrade(89.9)).toBe("B");
      expect(scoreToGrade(80)).toBe("B");
      expect(scoreToGrade(79.9)).toBe("C");
      expect(scoreToGrade(70)).toBe("C");
      expect(scoreToGrade(69.9)).toBe("D");
      expect(scoreToGrade(60)).toBe("D");
      expect(scoreToGrade(59.9)).toBe("F");
    });

    it("maps grade to exit code", () => {
      expect(gradeToExitCode("A")).toBe(0);
      expect(gradeToExitCode("B")).toBe(0);
      expect(gradeToExitCode("C")).toBe(0);
      expect(gradeToExitCode("D")).toBe(1);
      expect(gradeToExitCode("F")).toBe(1);
    });

    it("builds weighted scorecard and uses repo fullName fallback", () => {
      const data = {
        readme: { exists: false },
        ci: { workflows: [], workflowRuns: [] },
        issues: { open: [], closed: [], labels: [] },
        activity: { recentCommits: [], contributors: [], lastCommitDate: null },
        releases: { releases: [], tags: [] },
        community: {
          hasLicense: true,
          hasContributing: true,
          hasCodeOfConduct: true,
          hasIssueTemplate: true,
        },
      };

      const scorecard = buildScorecard({ owner: "octocat", repo: "hello-world" }, data);
      expect(scorecard.repository).toBe("octocat/hello-world");
      expect(scorecard.categories).toHaveLength(6);

      const categoryIds = scorecard.categories.map((c) => c.id).sort();
      expect(categoryIds).toEqual([
        "activity",
        "ciCd",
        "communityHealth",
        "issueHygiene",
        "readme",
        "releaseMaturity",
      ]);

      const expectedOverallRaw = scorecard.categories.reduce(
        (sum, category) => sum + category.score * CATEGORY_WEIGHTS[category.id],
        0,
      );
      const expectedRounded = Math.round(expectedOverallRaw * 10) / 10;
      expect(scorecard.overallScore).toBe(expectedRounded);
      expect(Number.isNaN(Date.parse(scorecard.generatedAt))).toBe(false);
    });
  });
});
