// ORIGINALLY FROM CLOUDFLARE WRANGLER:
// https://github.com/cloudflare/wrangler2/blob/main/.github/changeset-version.js

import { execSync } from "child_process";

// This script is used by the `release.yml` workflow to update the version of the
// packages being released. The standard step is only to run `changeset version`,
// but that does not refresh the lockfile, so an install is run afterwards.
// See https://github.com/changesets/changesets/issues/421.
//
// Three problems with the previous implementation:
//
//   1. `exec` is asynchronous. Both commands were started at the same time, so
//      the install raced the version bump and could read `package.json` files
//      mid-rewrite — or finish before them, leaving the lockfile stale, which is
//      exactly what this script exists to prevent.
//   2. Neither exit code was inspected and no callback was supplied, so a failed
//      version bump left the workflow green and produced an empty release PR.
//   3. It ran `npm install`, but this is a pnpm workspace (`pnpm-workspace.yaml`,
//      `pnpm-lock.yaml`). `npm install` would generate a `package-lock.json`
//      alongside the real lockfile and resolve the workspace differently.
//
// `execSync` runs the commands one after another, inherits stdio so the log shows
// their output, and throws on a non-zero exit — which fails the workflow step as
// it should. Every command here is a fixed literal with no interpolated input, so
// running them through a shell introduces nothing to inject into; that also keeps
// the `pnpm` shim resolvable on Windows, where Node refuses to spawn a `.cmd`
// directly without one.
const run = (command) => {
  execSync(command, { stdio: "inherit" });
};

run("pnpm changeset version");

// `--no-frozen-lockfile` is required: `changeset version` has just changed the
// package versions, so the committed lockfile no longer matches and pnpm's CI
// default of `--frozen-lockfile` would abort instead of updating it.
run("pnpm install --no-frozen-lockfile");
