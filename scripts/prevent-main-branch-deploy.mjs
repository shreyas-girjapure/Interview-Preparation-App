#!/usr/bin/env node

import process from "node:process";

const isVercelBuild = process.env.VERCEL === "1";
const vercelEnv = (process.env.VERCEL_ENV ?? "").toLowerCase();
const branch = process.env.VERCEL_GIT_COMMIT_REF ?? "";
const allowOverride =
  process.env.ALLOW_NON_MAIN_PROD_DEPLOY === "true" ||
  process.env.ALLOW_MAIN_BRANCH_DEPLOY === "true";

if (!isVercelBuild) {
  process.exit(0);
}

if (vercelEnv !== "production") {
  process.exit(0);
}

if (branch === "main") {
  process.exit(0);
}

if (allowOverride) {
  console.log(
    "Production branch guard bypassed because ALLOW_NON_MAIN_PROD_DEPLOY=true.",
  );
  process.exit(0);
}

console.error(
  `Deployment blocked: production deploys must come from 'main' (received '${branch || "unknown"}').`,
);
console.error(
  "Use Vercel previews for non-main branches (for example 'dev') or set ALLOW_NON_MAIN_PROD_DEPLOY=true for a one-off override.",
);
process.exit(1);
