import { describe, expect, it, vi } from "vitest";
import { runCli } from "../src/cli.js";

function makeIo() {
  let stdout = "";
  let stderr = "";

  return {
    io: {
      stdout: { write: (value) => { stdout += value; } },
      stderr: { write: (value) => { stderr += value; } },
    },
    getStdout: () => stdout,
    getStderr: () => stderr,
  };
}

describe("CLI integration", () => {
  it("prints help and exits 0", async () => {
    const stream = makeIo();

    const code = await runCli(["--help"], {
      ...stream,
      parseRepoInput: vi.fn(),
      createGitHubClient: vi.fn(),
      fetchRepositoryData: vi.fn(),
      buildScorecard: vi.fn(),
      formatScorecard: vi.fn(),
      normalizeGitHubError: vi.fn(),
    });

    expect(code).toBe(0);
    expect(stream.getStdout()).toContain("Usage: repo-scorecard");
  });

  it("returns exit code 0 for passing grade and writes formatted output", async () => {
    const stream = makeIo();

    const parseRepoInput = vi.fn(() => ({ owner: "octocat", repo: "hello-world", fullName: "octocat/hello-world" }));
    const createGitHubClient = vi.fn(({ token }) => ({ mocked: true, token }));
    const fetchRepositoryData = vi.fn(async () => ({ fetched: true }));
    const buildScorecard = vi.fn(() => ({
      repository: "octocat/hello-world",
      overallScore: 82.5,
      grade: "B",
      generatedAt: new Date().toISOString(),
      categories: [],
    }));
    const formatScorecard = vi.fn(() => "formatted scorecard");

    const code = await runCli(["octocat/hello-world", "--token", "abc123"], {
      ...stream,
      parseRepoInput,
      createGitHubClient,
      fetchRepositoryData,
      buildScorecard,
      formatScorecard,
      normalizeGitHubError: (err) => err.message,
    });

    expect(code).toBe(0);
    expect(createGitHubClient).toHaveBeenCalledWith({ token: "abc123" });
    expect(parseRepoInput).toHaveBeenCalledWith("octocat/hello-world");
    expect(fetchRepositoryData).toHaveBeenCalled();
    expect(buildScorecard).toHaveBeenCalled();
    expect(formatScorecard).toHaveBeenCalled();
    expect(stream.getStdout()).toContain("formatted scorecard");
  });

  it("returns exit code 1 for failing grade", async () => {
    const stream = makeIo();

    const code = await runCli(["octocat/hello-world"], {
      ...stream,
      parseRepoInput: () => ({ owner: "octocat", repo: "hello-world", fullName: "octocat/hello-world" }),
      createGitHubClient: () => ({ mocked: true }),
      fetchRepositoryData: async () => ({}),
      buildScorecard: () => ({
        repository: "octocat/hello-world",
        overallScore: 61.0,
        grade: "D",
        generatedAt: new Date().toISOString(),
        categories: [],
      }),
      formatScorecard: () => "formatted scorecard",
      normalizeGitHubError: (err) => err.message,
    });

    expect(code).toBe(1);
  });

  it("prints usage and exits 1 for CLI argument errors", async () => {
    const stream = makeIo();

    const code = await runCli([], {
      ...stream,
      normalizeGitHubError: (err) => err.message,
    });

    expect(code).toBe(1);
    expect(stream.getStderr()).toContain("Repository argument is required.");
    expect(stream.getStderr()).toContain("Usage: repo-scorecard");
  });

  it("normalizes upstream GitHub errors", async () => {
    const stream = makeIo();

    const code = await runCli(["octocat/hello-world"], {
      ...stream,
      parseRepoInput: () => ({ owner: "octocat", repo: "hello-world", fullName: "octocat/hello-world" }),
      createGitHubClient: () => ({ mocked: true }),
      fetchRepositoryData: async () => {
        const error = new Error("raw GitHub failure");
        error.status = 403;
        throw error;
      },
      buildScorecard: () => {
        throw new Error("should not be called");
      },
      formatScorecard: () => "",
      normalizeGitHubError: () => "normalized GitHub error",
    });

    expect(code).toBe(1);
    expect(stream.getStderr()).toContain("normalized GitHub error");
  });
});
