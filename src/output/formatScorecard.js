function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function pad(value, width) {
  return String(value).padEnd(width, " ");
}

export function formatScorecard(scorecard) {
  const lines = [];

  lines.push(`Repository: ${scorecard.repository}`);
  lines.push(`Overall Score: ${scorecard.overallScore.toFixed(1)}/100`);
  lines.push(`Grade: ${scorecard.grade}`);
  lines.push(`Generated At: ${scorecard.generatedAt}`);
  lines.push("");

  lines.push(`${pad("Category", 24)}${pad("Weight", 8)}${pad("Score", 8)}Contribution`);
  lines.push("-".repeat(60));

  for (const category of scorecard.categories) {
    const contribution = (category.score * category.weight).toFixed(1);
    lines.push(
      `${pad(category.name, 24)}${pad(formatPercent(category.weight), 8)}${pad(category.score, 8)}${contribution}`,
    );
  }

  lines.push("");
  lines.push("Diagnostics:");

  for (const category of scorecard.categories) {
    lines.push(`- ${category.name}:`);
    for (const item of category.rationale) {
      lines.push(`  - ${item}`);
    }
  }

  return lines.join("\n");
}
