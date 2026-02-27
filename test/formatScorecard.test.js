import { describe, expect, it } from "vitest";
import { formatScorecard } from "../src/output/formatScorecard.js";

describe("formatScorecard", () => {
  it("formats repository metadata and category table", () => {
    const output = formatScorecard({
      repository: "octocat/hello-world",
      overallScore: 82.5,
      grade: "B",
      generatedAt: "2026-01-15T00:00:00.000Z",
      categories: [
        {
          id: "readme",
          name: "README Quality",
          weight: 0.2,
          score: 90,
          rationale: ["README found.", "Badges found."],
        },
        {
          id: "ciCd",
          name: "CI/CD Health",
          weight: 0.2,
          score: 75,
          rationale: ["Workflows detected."],
        },
      ],
    });

    expect(output).toContain("Repository: octocat/hello-world");
    expect(output).toContain("Overall Score: 82.5/100");
    expect(output).toContain("Grade: B");
    expect(output).toContain("Generated At: 2026-01-15T00:00:00.000Z");

    expect(output).toContain("Category");
    expect(output).toContain("Weight");
    expect(output).toContain("Score");
    expect(output).toContain("Contribution");

    expect(output).toContain("README Quality");
    expect(output).toContain("20%");
    expect(output).toContain("18.0");

    expect(output).toContain("Diagnostics:");
    expect(output).toContain("- README Quality:");
    expect(output).toContain("  - README found.");
    expect(output).toContain("  - Badges found.");
    expect(output).toContain("- CI/CD Health:");
    expect(output).toContain("  - Workflows detected.");
  });

  it("renders categories without rationale items safely", () => {
    const output = formatScorecard({
      repository: "octocat/empty",
      overallScore: 0,
      grade: "F",
      generatedAt: "2026-01-15T00:00:00.000Z",
      categories: [
        {
          id: "communityHealth",
          name: "Community Health",
          weight: 0.15,
          score: 0,
          rationale: [],
        },
      ],
    });

    expect(output).toContain("Community Health");
    expect(output).toContain("15%");
    expect(output).toContain("0.0");
    expect(output).toContain("- Community Health:");
  });
});
