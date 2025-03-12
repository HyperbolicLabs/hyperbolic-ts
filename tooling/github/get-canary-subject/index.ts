import * as core from "@actions/core";
import * as github from "@actions/github";
import * as colors from "colorette";

export function run(): string {
  try {
    // Remove the `refs/heads/` prefix from the branch name
    const rawBranchName = github.context.ref.split("refs/heads/").pop();

    // If the branch name is undefined, throw an error
    if (!rawBranchName) {
      throw new Error("Unable to detect branch name.");
    }

    // Truncate the name to a reasonable length and
    // replace all non-alphanumeric characters with a dash
    const sanitizedBranchName = rawBranchName.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-");

    // Log info but don't use core.setOutput since we're returning the value directly
    console.info(
      colors.whiteBright("The subject of your canary deploy will be: "),
      colors.greenBright(sanitizedBranchName),
    );

    return sanitizedBranchName;
  } catch (error) {
    console.error(colors.redBright("Error getting canary subject:"));
    console.error(colors.redBright((error as { message: string }).message));
    core.setFailed((error as { message: string }).message);
    process.exit(1);
  }
}

// Print the result to stdout so it can be captured by the bash command
console.log(run());
