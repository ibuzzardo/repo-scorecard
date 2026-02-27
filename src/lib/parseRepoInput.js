class RepoInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "RepoInputError";
  }
}

function normalizeOwnerRepo(owner, repo) {
  const cleanedOwner = owner?.trim();
  let cleanedRepo = repo?.trim();

  if (!cleanedOwner || !cleanedRepo) {
    throw new RepoInputError("Repository must be in the format owner/repo or a GitHub repository URL.");
  }

  cleanedRepo = cleanedRepo.replace(/\.git$/i, "");

  if (!cleanedRepo) {
    throw new RepoInputError("Repository name cannot be empty.");
  }

  return {
    owner: cleanedOwner,
    repo: cleanedRepo,
    fullName: `${cleanedOwner}/${cleanedRepo}`,
  };
}

function parseFromUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new RepoInputError("Invalid repository URL.");
  }

  if (url.hostname.toLowerCase() !== "github.com") {
    throw new RepoInputError("Only github.com repository URLs are supported.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new RepoInputError("GitHub URL must include both owner and repository name.");
  }

  return normalizeOwnerRepo(segments[0], segments[1]);
}

export function parseRepoInput(input) {
  if (!input || typeof input !== "string") {
    throw new RepoInputError("Repository argument is required.");
  }

  const trimmed = input.trim();
  if (!trimmed) {
    throw new RepoInputError("Repository argument cannot be empty.");
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return parseFromUrl(trimmed);
  }

  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length !== 2) {
    throw new RepoInputError("Repository must be in the format owner/repo or a GitHub repository URL.");
  }

  return normalizeOwnerRepo(segments[0], segments[1]);
}

export { RepoInputError };
