import { describe, expect, it } from "vitest";

import { sanitizeBranchName } from "./sanitize-branch-name";

describe("sanitizeBranchName", () => {
  it("should truncate branch names longer than 30 characters", () => {
    const longBranchName = "this-is-a-very-long-branch-name-that-exceeds-thirty-characters";
    const result = sanitizeBranchName(longBranchName);

    expect(result.length).toBeLessThanOrEqual(30);
    expect(result).toBe("this-is-a-very-long-branch-nam");
  });

  it("should replace non-alphanumeric characters with dashes", () => {
    const branchName = "feature/new_component@v1.0";
    const result = sanitizeBranchName(branchName);

    expect(result).toBe("feature-new-component-v1-0");
  });

  it("should handle branch names with special characters", () => {
    const branchName = "fix: auth bug #123";
    const result = sanitizeBranchName(branchName);

    expect(result).toBe("fix--auth-bug--123");
  });

  it("should not modify branch names that are already valid", () => {
    const branchName = "release-v1-0-0";
    const result = sanitizeBranchName(branchName);

    expect(result).toBe("release-v1-0-0");
  });

  it("should handle empty strings", () => {
    const branchName = "";
    const result = sanitizeBranchName(branchName);

    expect(result).toBe("");
  });
});
