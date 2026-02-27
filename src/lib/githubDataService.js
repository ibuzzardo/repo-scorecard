const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function decodeBase64(content) {
  return Buffer.from(content, "base64").toString("utf8");
}

function isNotFound(error) {
  return error?.status === 404;
}

async function safeRequest(request, fallbackValue) {
  try {
    return await request();
  } catch (error) {
    if (isNotFound(error)) {
      return fallbackValue;
    }
    throw error;
  }
}

function stripPullRequests(issues) {
  return issues.filter((issue) => !issue.pull_request);
}

async function paginateList(method, params, maxItems = 300) {
  const out = [];
  let page = 1;

  while (out.length < maxItems) {
    const response = await method({ ...params, per_page: 100, page });
    const items = Array.isArray(response.data) ? response.data : [];

    if (items.length === 0) {
      break;
    }

    out.push(...items);

    if (items.length < 100) {
      break;
    }

    page += 1;
  }

  return out.slice(0, maxItems);
}

async function fileExists(octokit, owner, repo, path) {
  return safeRequest(
    async () => {
      await octokit.repos.getContent({ owner, repo, path });
      return true;
    },
    false,
  );
}

async function hasAnyFile(octokit, owner, repo, paths) {
  for (const path of paths) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await fileExists(octokit, owner, repo, path);
    if (exists) {
      return true;
    }
  }
  return false;
}

async function hasIssueTemplates(octokit, owner, repo) {
  const singleTemplate = await hasAnyFile(octokit, owner, repo, [
    ".github/ISSUE_TEMPLATE.md",
    "docs/ISSUE_TEMPLATE.md",
  ]);

  if (singleTemplate) {
    return true;
  }

  return safeRequest(
    async () => {
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path: ".github/ISSUE_TEMPLATE",
      });

      if (Array.isArray(response.data)) {
        return response.data.length > 0;
      }

      return Boolean(response.data);
    },
    false,
  );
}

export async function fetchRepositoryData(octokit, { owner, repo }) {
  const repoResponse = await octokit.repos.get({ owner, repo });
  const repoData = repoResponse.data;

  const readme = await safeRequest(
    async () => {
      const response = await octokit.repos.getReadme({ owner, repo });
      const content = decodeBase64(response.data.content || "");
      return {
        exists: true,
        content,
        length: content.length,
      };
    },
    { exists: false, content: "", length: 0 },
  );

  const workflowsResponse = await safeRequest(
    () => octokit.actions.listRepoWorkflows({ owner, repo, per_page: 100 }),
    { data: { workflows: [] } },
  );
  const workflows = workflowsResponse.data?.workflows || [];

  const workflowRunsResponse = await safeRequest(
    () => octokit.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 100 }),
    { data: { workflow_runs: [] } },
  );
  const workflowRuns = workflowRunsResponse.data?.workflow_runs || [];

  const openIssues = stripPullRequests(
    await paginateList(octokit.issues.listForRepo, { owner, repo, state: "open" }, 300),
  );
  const closedIssues = stripPullRequests(
    await paginateList(octokit.issues.listForRepo, { owner, repo, state: "closed" }, 300),
  );

  const labels = await paginateList(octokit.issues.listLabelsForRepo, { owner, repo }, 200);

  const sinceIso = new Date(Date.now() - 30 * ONE_DAY_MS).toISOString();
  const recentCommits = await paginateList(
    octokit.repos.listCommits,
    { owner, repo, since: sinceIso },
    300,
  );

  const lastCommitResponse = await safeRequest(
    () => octokit.repos.listCommits({ owner, repo, per_page: 1 }),
    { data: [] },
  );
  const lastCommitDate = lastCommitResponse.data?.[0]?.commit?.committer?.date || null;

  const contributors = await paginateList(octokit.repos.listContributors, { owner, repo }, 200);

  const releases = await paginateList(octokit.repos.listReleases, { owner, repo }, 100);
  const tags = await paginateList(octokit.repos.listTags, { owner, repo }, 100);

  const hasContributing = await hasAnyFile(octokit, owner, repo, [
    "CONTRIBUTING.md",
    ".github/CONTRIBUTING.md",
    "docs/CONTRIBUTING.md",
  ]);

  const hasCodeOfConduct = await hasAnyFile(octokit, owner, repo, [
    "CODE_OF_CONDUCT.md",
    ".github/CODE_OF_CONDUCT.md",
    "docs/CODE_OF_CONDUCT.md",
  ]);

  const issueTemplate = await hasIssueTemplates(octokit, owner, repo);

  return {
    repository: {
      owner,
      repo,
      fullName: repoData.full_name,
      htmlUrl: repoData.html_url,
      defaultBranch: repoData.default_branch,
      openIssuesCount: repoData.open_issues_count,
      pushedAt: repoData.pushed_at,
    },
    readme,
    ci: {
      workflows,
      workflowRuns,
    },
    issues: {
      open: openIssues,
      closed: closedIssues,
      labels,
    },
    activity: {
      recentCommits,
      lastCommitDate,
      contributors,
    },
    releases: {
      releases,
      tags,
    },
    community: {
      hasLicense: Boolean(repoData.license),
      hasContributing,
      hasCodeOfConduct,
      hasIssueTemplate: issueTemplate,
    },
  };
}
