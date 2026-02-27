export function scoreCommunityHealth(community) {
  const hasLicense = Boolean(community?.hasLicense);
  const hasContributing = Boolean(community?.hasContributing);
  const hasCodeOfConduct = Boolean(community?.hasCodeOfConduct);
  const hasIssueTemplate = Boolean(community?.hasIssueTemplate);

  const score =
    (hasLicense ? 25 : 0) +
    (hasContributing ? 25 : 0) +
    (hasCodeOfConduct ? 25 : 0) +
    (hasIssueTemplate ? 25 : 0);

  return {
    score,
    rationale: [
      hasLicense ? "LICENSE present." : "LICENSE missing.",
      hasContributing ? "CONTRIBUTING.md present." : "CONTRIBUTING.md missing.",
      hasCodeOfConduct ? "CODE_OF_CONDUCT.md present." : "CODE_OF_CONDUCT.md missing.",
      hasIssueTemplate ? "Issue template(s) present." : "Issue template(s) missing.",
    ],
    metrics: {
      hasLicense,
      hasContributing,
      hasCodeOfConduct,
      hasIssueTemplate,
    },
  };
}
