import * as core from "@actions/core";
import * as github from "@actions/github";
import * as colors from "colorette";

import { sanitizeBranchName } from "./sanitize-branch-name";

function run(): string {
  try {
    // Remove the `refs/heads/` prefix from the branch name
    const rawBranchName = github.context.ref.split("refs/heads/").pop();

    // If the branch name is undefined, throw an error
    if (!rawBranchName) {
      throw new Error("Unable to detect branch name.");
    }

    const sanitizedBranchName = sanitizeBranchName(rawBranchName);

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
