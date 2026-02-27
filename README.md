# repo-scorecard

GitHub Repo Health Scorecard - A CLI tool that analyzes GitHub repositories and produces a health score. Built autonomously by Dark Factory v4.

## Installation

```bash
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
npx repo-scorecard vercel/next.js --token <github_token>
# or
GITHUB_TOKEN=<github_token> npx repo-scorecard vercel/next.js
```

## Accepted Repository Input Formats

- `owner/repo`
- `https://github.com/owner/repo`
- `https://github.com/owner/repo.git`

## Scoring Model

Each category is scored from `0-100`, then combined using weighted scoring:

1. README Quality (20%)
   - README exists
   - Length > 500 characters
   - Badge detection
   - Section heading detection
2. CI/CD Health (20%)
   - GitHub Actions workflows present
   - Recent workflow runs (last 30 days)
   - Completed-run pass rate
3. Issue Hygiene (15%)
   - Open/closed issue ratio
   - Median age of open issues
   - Label usage and coverage
4. Activity Score (20%)
   - Commits in last 30 days
   - Last commit recency
   - Number of contributors
5. Release Maturity (10%)
   - Releases/tags present
   - Semantic version usage
   - Release cadence (last 12 months)
6. Community Health (15%)
   - LICENSE
   - CONTRIBUTING.md
   - CODE_OF_CONDUCT.md
   - Issue templates

## Grades and CI Gate Behavior

Numeric weighted score is mapped to a letter grade:

- `A`: 90-100
- `B`: 80-89.9
- `C`: 70-79.9
- `D`: 60-69.9
- `F`: below 60

Process exit code:

- `0` for grades `A-C`
- `1` for grades `D-F`

This makes the tool usable in CI as a quality gate.

## Scripts

```bash
npm test
npm run test:watch
npm run build
npm run lint
```
