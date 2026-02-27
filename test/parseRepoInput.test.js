import { describe, expect, it } from "vitest";
import { parseRepoInput, RepoInputError } from "../src/lib/parseRepoInput.js";

describe("parseRepoInput", () => {
  it("parses owner/repo format", () => {
    expect(parseRepoInput("octocat/hello-world")).toEqual({
      owner: "octocat",
      repo: "hello-world",
      fullName: "octocat/hello-world",
    });
  });

  it("trims owner/repo input", () => {
    expect(parseRepoInput("  octocat/hello-world  ")).toEqual({
      owner: "octocat",
      repo: "hello-world",
      fullName: "octocat/hello-world",
    });
  });

  it("parses GitHub URL format", () => {
    expect(parseRepoInput("https://github.com/octocat/hello-world")).toEqual({
      owner: "octocat",
      repo: "hello-world",
      fullName: "octocat/hello-world",
    });
  });

  it("parses URL with query/hash and trailing slash", () => {
    expect(parseRepoInput("https://github.com/octocat/hello-world/?tab=readme#intro")).toEqual({
      owner: "octocat",
      repo: "hello-world",
      fullName: "octocat/hello-world",
    });
  });

  it("normalizes trailing .git in URL and plain input", () => {
    expect(parseRepoInput("https://github.com/octocat/hello-world.git")).toEqual({
      owner: "octocat",
      repo: "hello-world",
      fullName: "octocat/hello-world",
    });

    expect(parseRepoInput("octocat/hello-world.git")).toEqual({
      owner: "octocat",
      repo: "hello-world",
      fullName: "octocat/hello-world",
    });
  });

  it("rejects empty or non-string input", () => {
    expect(() => parseRepoInput("")).toThrow("Repository argument is required.");
    expect(() => parseRepoInput("   ")).toThrow("Repository argument cannot be empty.");
    expect(() => parseRepoInput(undefined)).toThrow("Repository argument is required.");
    expect(() => parseRepoInput(null)).toThrow("Repository argument is required.");
    expect(() => parseRepoInput(42)).toThrow("Repository argument is required.");
  });

  it("rejects invalid URLs", () => {
    expect(() => parseRepoInput("https://github.com")).toThrow(
      "GitHub URL must include both owner and repository name.",
    );
    expect(() => parseRepoInput("https://gitlab.com/octocat/hello-world")).toThrow(
      "Only github.com repository URLs are supported.",
    );
    expect(() => parseRepoInput("https://")).toThrow("Invalid repository URL.");
  });

  it("rejects invalid owner/repo format", () => {
    expect(() => parseRepoInput("octocat")).toThrow(
      "Repository must be in the format owner/repo or a GitHub repository URL.",
    );
    expect(() => parseRepoInput("octocat/hello-world/extra")).toThrow(
      "Repository must be in the format owner/repo or a GitHub repository URL.",
    );
  });

  it("throws RepoInputError for parse failures", () => {
    try {
      parseRepoInput("octocat");
      throw new Error("expected parse to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(RepoInputError);
      expect(error.name).toBe("RepoInputError");
    }
  });
});
