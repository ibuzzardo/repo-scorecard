import { Octokit } from "@octokit/rest";

export function createGitHubClient({ token } = {}) {
  const authToken = token || process.env.GITHUB_TOKEN;

  return new Octokit({
    auth: authToken,
    userAgent: "repo-scorecard-cli/1.0.0",
  });
}

export function normalizeGitHubError(error) {
  if (!error) {
    return "Unknown error.";
  }

  if (error.status === 404) {
    return "Repository not found or inaccessible with the provided credentials.";
  }

  if (error.status === 401 || error.status === 403) {
    const remaining = error?.response?.headers?.["x-ratelimit-remaining"];
    if (remaining === "0") {
      return "GitHub API rate limit exceeded. Provide GITHUB_TOKEN or retry later.";
    }
    return "GitHub API authorization failed. Check token permissions or repository visibility.";
  }

  if (typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  return "Unexpected GitHub API error.";
}
