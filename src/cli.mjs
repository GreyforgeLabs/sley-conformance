#!/usr/bin/env node
import { loadConformance, reportHealth, requireCoverage, requireCoverageThreshold } from "./index.mjs";

const [command, ...args] = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const positional = args.filter((arg) => !arg.startsWith("--"));
const rootIndex = args.indexOf("--root");
const root = rootIndex >= 0 ? args[rootIndex + 1] : "../sley";

if (!command || command === "help" || flags.has("--help")) {
  console.log("usage: sley-conformance <report|coverage|guard|markdown> --root <sley-root>");
  process.exit(0);
}

const report = loadConformance(root);

function requireArg(flag, fallback = null) {
  const index = args.indexOf(flag);
  if (index < 0) return fallback;
  return args[index + 1];
}

if (command === "report") {
  const asMarkdown = flags.has("--markdown");
  const asJson = flags.has("--json");
  if (asMarkdown) {
    console.log(`# Sley Conformance

- root: ${report.root}
- schemas: ${report.schemas.count}
- contracts: ${report.contracts.count}
- smoke cases: ${report.smoke.cases}
- smoke tags: ${report.smoke.tag_count}
`);
    process.exit(0);
  }
  if (asJson || !asMarkdown) {
    console.log(JSON.stringify(report, null, 2));
  }
  process.exit(0);
} else if (command === "coverage") {
  const tag = requireArg("--require-tag");
  const minimum = Number(requireArg("--minimum", "1"));
  if (!tag) {
    throw new Error("coverage requires --require-tag <tag>");
  }
  const result = Number.isFinite(minimum) && minimum > 1
    ? requireCoverageThreshold(report, tag, minimum)
    : requireCoverage(report, tag);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
} else if (command === "guard") {
  const tag = requireArg("--require-tag");
  const minimum = Number(requireArg("--minimum", 1));
  const checks = [];
  checks.push(reportHealth(report));
  if (tag) {
    checks.push(Number.isFinite(minimum) && minimum > 1
      ? requireCoverageThreshold(report, tag, minimum)
      : requireCoverage(report, tag));
  }
  const ok = checks.every((entry) => entry.ok);
  console.log(JSON.stringify({ schema: "sley.conformance.guard.v0", ok, checks }, null, 2));
  process.exit(ok ? 0 : 1);
} else {
  throw new Error(`unknown command ${command}`);
}
