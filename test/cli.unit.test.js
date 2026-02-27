import { describe, expect, it } from "vitest";
import { parseCliArgs } from "../src/cli.js";

describe("parseCliArgs", () => {
  it("returns help for -h and --help", () => {
    expect(parseCliArgs(["-h"])) .toEqual({ help: true });
    expect(parseCliArgs(["--help"])) .toEqual({ help: true });
  });

  it("parses repository only", () => {
    expect(parseCliArgs(["octocat/hello-world"])) .toEqual({
      help: false,
      repoInput: "octocat/hello-world",
      token: undefined,
    });
  });

  it("parses token with separate value", () => {
    expect(parseCliArgs(["--token", "abc123", "octocat/hello-world"])) .toEqual({
      help: false,
      repoInput: "octocat/hello-world",
      token: "abc123",
    });

    expect(parseCliArgs(["-t", "abc123", "octocat/hello-world"])) .toEqual({
      help: false,
      repoInput: "octocat/hello-world",
      token: "abc123",
    });
  });

  it("parses token with equals syntax", () => {
    expect(parseCliArgs(["--token=abc123", "octocat/hello-world"])) .toEqual({
      help: false,
      repoInput: "octocat/hello-world",
      token: "abc123",
    });
  });

  it("allows token after repository", () => {
    expect(parseCliArgs(["octocat/hello-world", "--token", "abc123"])) .toEqual({
      help: false,
      repoInput: "octocat/hello-world",
      token: "abc123",
    });
  });

  it("throws when token option is missing value", () => {
    expect(() => parseCliArgs(["--token"])) .toThrow("Missing value for --token option.");
    expect(() => parseCliArgs(["-t"])) .toThrow("Missing value for --token option.");
    expect(() => parseCliArgs(["--token="])) .toThrow("Missing value for --token option.");
  });

  it("throws for unknown option", () => {
    expect(() => parseCliArgs(["--wat", "octocat/hello-world"])) .toThrow("Unknown option: --wat");
  });

  it("throws for multiple repository args", () => {
    expect(() => parseCliArgs(["octocat/one", "octocat/two"])) .toThrow(
      "Only one repository argument is allowed.",
    );
  });

  it("throws when repository argument is missing", () => {
    expect(() => parseCliArgs([])).toThrow("Repository argument is required.");
  });
});
