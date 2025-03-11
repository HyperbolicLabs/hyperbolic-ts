/**
 * Truncate the name to a reasonable length and
 * replace all non-alphanumeric characters with a dash
 */
export const sanitizeBranchName = (branchName: string) => {
  return branchName.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-");
};
