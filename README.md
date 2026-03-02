# repo-scorecard

> Built with [Dark Factory v4](https://github.com/ibuzzardo/dark-factory-v4) — autonomous AI software development pipeline

GitHub Repo Health Scorecard — a CLI tool that analyses GitHub repositories and produces a health score with letter grades.

## Features

- Analyses any public GitHub repository from a URL or `owner/repo` string
- 6 scoring categories with configurable weights
- Letter grades (A–F) with CI-friendly exit codes
- Optional GitHub token for higher rate limits
- Clean terminal output with per-category breakdown

## Tech Stack

- Node.js, ES modules
- Octokit (GitHub REST API client)
- Jest for testing

## Installation

```bash
git clone https://github.com/ibuzzardo/repo-scorecard.git
cd repo-scorecard
cp .env.example .env
npm install
```

## Usage

```bash
npx repo-scorecard <owner/repo>
npx repo-scorecard <github-url>
```

Examples:

```bash
npx repo-scorecard vercel/next.js
npx repo-scorecard https://github.com/vercel/next.js
```

Optional auth token:

```bash
GITHUB_TOKEN=<token> npx repo-scorecard vercel/next.js
npx repo-scorecard vercel/next.js --token <token>
```

## Scoring Model

Each category is scored 0–100, then combined with weighted scoring:

| Category | Weight | Checks |
|----------|--------|--------|
| README Quality | 20% | Exists, length, badges, section headings |
| CI/CD Health | 20% | Workflows present, recent runs, pass rate |
| Issue Hygiene | 15% | Open/closed ratio, median age, label usage |
| Activity Score | 20% | Recent commits, last commit recency, contributors |
| Release Maturity | 10% | Releases/tags, semver, cadence |
| Community Health | 15% | LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, templates |

Grades: A (90+), B (80–89), C (70–79), D (60–69), F (<60). Exit code 0 for A–C, 1 for D–F (CI gate).

## Pipeline Stats

- **Sprint cost:** ~$1.10
- **Coder passes:** 1

## License

MIT — see [LICENSE](LICENSE)
