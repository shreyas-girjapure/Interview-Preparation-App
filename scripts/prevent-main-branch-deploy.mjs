#!/usr/bin/env node

import process from "node:process";

const isVercelBuild = process.env.VERCEL === "1";
const branch = process.env.VERCEL_GIT_COMMIT_REF ?? "";
const allowOverride = process.env.ALLOW_MAIN_BRANCH_DEPLOY === "true";

if (!isVercelBuild) {
  process.exit(0);
}

if (branch !== "main") {
  process.exit(0);
}

if (allowOverride) {
  console.log(
    "Main-branch deploy guard bypassed because ALLOW_MAIN_BRANCH_DEPLOY=true.",
  );
  process.exit(0);
}

console.error("Deployment blocked: branch 'main' is not allowed to deploy.");
console.error(
  "Use a non-main branch (for example 'dev') or set ALLOW_MAIN_BRANCH_DEPLOY=true for a one-off override.",
);
process.exit(1);
