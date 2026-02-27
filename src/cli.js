#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { parseRepoInput } from "./lib/parseRepoInput.js";
import { createGitHubClient, normalizeGitHubError } from "./lib/githubClient.js";
import { fetchRepositoryData } from "./lib/githubDataService.js";
import { buildScorecard, gradeToExitCode } from "./scoring/index.js";
import { formatScorecard } from "./output/formatScorecard.js";

const USAGE = `Usage: repo-scorecard [options] <owner/repo|github-url>

Options:
  -t, --token <token>   GitHub token (default: GITHUB_TOKEN env var)
  -h, --help            Show this help message
`;

class CliArgumentError extends Error {
  constructor(message) {
    super(message);
    this.name = "CliArgumentError";
  }
}

export function parseCliArgs(argv) {
  let repoInput;
  let token;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") {
      return { help: true };
    }

    if (arg === "-t" || arg === "--token") {
      const value = argv[i + 1];
      if (!value) {
        throw new CliArgumentError("Missing value for --token option.");
      }
      token = value;
      i += 1;
      continue;
    }

    if (arg.startsWith("--token=")) {
      token = arg.slice("--token=".length);
      if (!token) {
        throw new CliArgumentError("Missing value for --token option.");
      }
      continue;
    }

    if (arg.startsWith("-")) {
      throw new CliArgumentError(`Unknown option: ${arg}`);
    }

    if (repoInput) {
      throw new CliArgumentError("Only one repository argument is allowed.");
    }

    repoInput = arg;
  }

  if (!repoInput) {
    throw new CliArgumentError("Repository argument is required.");
  }

  return { help: false, repoInput, token };
}

export async function runCli(argv = process.argv.slice(2), overrides = {}) {
  const io = overrides.io || { stdout: process.stdout, stderr: process.stderr };
  const deps = {
    parseRepoInput,
    createGitHubClient,
    fetchRepositoryData,
    buildScorecard,
    formatScorecard,
    normalizeGitHubError,
    ...overrides,
  };

  try {
    const args = parseCliArgs(argv);
    if (args.help) {
      io.stdout.write(`${USAGE}\n`);
      return 0;
    }

    const repo = deps.parseRepoInput(args.repoInput);
    const client = deps.createGitHubClient({ token: args.token });
    const data = await deps.fetchRepositoryData(client, repo);
    const scorecard = deps.buildScorecard(repo, data);
    const rendered = deps.formatScorecard(scorecard);

    io.stdout.write(`${rendered}\n`);
    return gradeToExitCode(scorecard.grade);
  } catch (error) {
    const isUserInputError = error?.name === "CliArgumentError" || error?.name === "RepoInputError";
    const message = isUserInputError ? error.message : deps.normalizeGitHubError(error);

    io.stderr.write(`Error: ${message}\n\n${USAGE}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().then((code) => {
    process.exitCode = code;
  });
}
