import { describe, expect, it, vi } from "vitest";
import { fetchRepositoryData } from "../src/lib/githubDataService.js";

function makeOctokit(overrides = {}) {
  const repos = {
    get: vi.fn(async () => ({ data: { full_name: "octocat/hello-world", default_branch: "main" } })),
    getReadme: vi.fn(async () => ({ data: { content: Buffer.from("# Hello\nReadme").toString("base64") } })),
    getContent: vi.fn(async ({ path }) => {
      if (path === ".github/ISSUE_TEMPLATE") {
        return { data: [{ name: "bug.yml" }] };
      }
      return { data: { name: path } };
    }),
    listCommits: vi.fn(async () => ({ data: [{ sha: "1" }, { sha: "2" }] })),
    listContributors: vi.fn(async () => ({ data: [{ id: 1 }, { id: 2 }] })),
    listReleases: vi.fn(async () => ({ data: [{ tag_name: "v1.0.0", published_at: new Date().toISOString() }] })),
    listTags: vi.fn(async () => ({ data: [{ name: "v1.0.0" }] })),
  };

  const actions = {
    listRepoWorkflows: vi.fn(async () => ({ data: { workflows: [{ id: 1, name: "ci" }] } })),
    listWorkflowRunsForRepo: vi.fn(async () => ({ data: { workflow_runs: [{ status: "completed", conclusion: "success" }] } })),
  };

  const issues = {
    listForRepo: vi.fn(async ({ state }) => {
      if (state === "open") {
        return {
          data: [
            { id: 1, created_at: new Date().toISOString(), labels: [{ name: "bug" }] },
            { id: 2, created_at: new Date().toISOString(), pull_request: { url: "https://api.github.com" } },
          ],
        };
      }

      return { data: [{ id: 3, created_at: new Date().toISOString(), labels: [] }] };
    }),
    listLabelsForRepo: vi.fn(async () => ({ data: [{ name: "bug" }, { name: "enhancement" }] })),
  };

  return {
    repos: { ...repos, ...(overrides.repos || {}) },
    actions: { ...actions, ...(overrides.actions || {}) },
    issues: { ...issues, ...(overrides.issues || {}) },
  };
}

describe("fetchRepositoryData", () => {
  it("returns normalized scorecard input data", async () => {
    const octokit = makeOctokit();

    const data = await fetchRepositoryData(octokit, { owner: "octocat", repo: "hello-world" });

    expect(data).toEqual(
      expect.objectContaining({
        readme: expect.any(Object),
        ci: expect.any(Object),
        issues: expect.any(Object),
        activity: expect.any(Object),
        releases: expect.any(Object),
        community: expect.any(Object),
      }),
    );

    expect(data.readme).toEqual(
      expect.objectContaining({
        exists: true,
        content: expect.any(String),
      }),
    );

    expect(data.ci).toEqual(
      expect.objectContaining({
        workflows: expect.any(Array),
        workflowRuns: expect.any(Array),
      }),
    );

    expect(data.issues.open.some((issue) => issue.pull_request)).toBe(false);
  });

  it("uses safe fallbacks when optional resources return 404", async () => {
    const notFound = Object.assign(new Error("not found"), { status: 404 });
    const octokit = makeOctokit({
      repos: {
        getReadme: vi.fn(async () => {
          throw notFound;
        }),
        getContent: vi.fn(async () => {
          throw notFound;
        }),
      },
      actions: {
        listRepoWorkflows: vi.fn(async () => {
          throw notFound;
        }),
        listWorkflowRunsForRepo: vi.fn(async () => {
          throw notFound;
        }),
      },
      issues: {
        listForRepo: vi.fn(async () => {
          throw notFound;
        }),
        listLabelsForRepo: vi.fn(async () => {
          throw notFound;
        }),
      },
    });

    const data = await fetchRepositoryData(octokit, { owner: "octocat", repo: "hello-world" });

    expect(data.readme).toEqual(
      expect.objectContaining({
        exists: false,
        content: "",
        length: 0,
      }),
    );

    expect(data.ci.workflows).toEqual([]);
    expect(data.ci.workflowRuns).toEqual([]);
    expect(data.issues.open).toEqual([]);
    expect(data.issues.closed).toEqual([]);
    expect(data.issues.labels).toEqual([]);
  });

  it("rethrows non-404 errors", async () => {
    const boom = Object.assign(new Error("boom"), { status: 500 });
    const octokit = makeOctokit({
      repos: {
        getReadme: vi.fn(async () => {
          throw boom;
        }),
      },
    });

    await expect(fetchRepositoryData(octokit, { owner: "octocat", repo: "hello-world" })).rejects.toThrow("boom");
  });
});
