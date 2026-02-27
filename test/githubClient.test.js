import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@octokit/rest", () => {
  return {
    Octokit: vi.fn(function MockOctokit(options) {
      this.options = options;
    }),
  };
});

import { Octokit } from "@octokit/rest";
import { createGitHubClient, normalizeGitHubError } from "../src/lib/githubClient.js";

describe("githubClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GITHUB_TOKEN;
  });

  describe("createGitHubClient", () => {
    it("uses explicit token over environment token", () => {
      process.env.GITHUB_TOKEN = "env-token";
      createGitHubClient({ token: "arg-token" });

      expect(Octokit).toHaveBeenCalledWith({
        auth: "arg-token",
        userAgent: "repo-scorecard-cli/1.0.0",
      });
    });

    it("falls back to GITHUB_TOKEN environment variable", () => {
      process.env.GITHUB_TOKEN = "env-token";
      createGitHubClient();

      expect(Octokit).toHaveBeenCalledWith({
        auth: "env-token",
        userAgent: "repo-scorecard-cli/1.0.0",
      });
    });

    it("creates client without auth when no token exists", () => {
      createGitHubClient({});

      expect(Octokit).toHaveBeenCalledWith({
        auth: undefined,
        userAgent: "repo-scorecard-cli/1.0.0",
      });
    });
  });

  describe("normalizeGitHubError", () => {
    it("handles empty/unknown errors", () => {
      expect(normalizeGitHubError()).toBe("Unknown error.");
      expect(normalizeGitHubError(null)).toBe("Unknown error.");
    });

    it("handles 404", () => {
      expect(normalizeGitHubError({ status: 404 })).toBe(
        "Repository not found or inaccessible with the provided credentials.",
      );
    });

    it("handles rate limit for 401/403 when x-ratelimit-remaining is zero", () => {
      expect(
        normalizeGitHubError({
          status: 403,
          response: { headers: { "x-ratelimit-remaining": "0" } },
        }),
      ).toBe("GitHub API rate limit exceeded. Provide GITHUB_TOKEN or retry later.");
    });

    it("handles authorization failures for 401/403", () => {
      expect(normalizeGitHubError({ status: 401, response: { headers: {} } })).toBe(
        "GitHub API authorization failed. Check token permissions or repository visibility.",
      );
      expect(normalizeGitHubError({ status: 403 })).toBe(
        "GitHub API authorization failed. Check token permissions or repository visibility.",
      );
    });

    it("uses message when present for non-special status", () => {
      expect(normalizeGitHubError({ status: 500, message: "Internal failure" })).toBe("Internal failure");
    });

    it("falls back to unexpected error message", () => {
      expect(normalizeGitHubError({ status: 500, message: "   " })).toBe("Unexpected GitHub API error.");
      expect(normalizeGitHubError({ status: 500 })).toBe("Unexpected GitHub API error.");
    });
  });
});
