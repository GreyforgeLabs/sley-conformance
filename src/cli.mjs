#!/usr/bin/env node
import { loadConformance, requireCoverage } from "./index.mjs";

const [command, ...args] = process.argv.slice(2);
const rootIndex = args.indexOf("--root");
const root = rootIndex >= 0 ? args[rootIndex + 1] : "../sley";

if (!command || command === "help" || command === "--help") {
  console.log("usage: sley-conformance <report|coverage> --root <sley-root>");
  process.exit(0);
}

const report = loadConformance(root);
if (command === "report") {
  if (args.includes("--markdown")) {
    console.log(`# Sley Conformance\n\n- schemas: ${report.schemas.count}\n- contracts: ${report.contracts.count}\n- smoke cases: ${report.smoke.cases}\n- smoke tags: ${report.smoke.tag_count}`);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
} else if (command === "coverage") {
  const tagIndex = args.indexOf("--require-tag");
  const tag = tagIndex >= 0 ? args[tagIndex + 1] : null;
  if (!tag) throw new Error("coverage requires --require-tag <tag>");
  const result = requireCoverage(report, tag);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
} else {
  throw new Error(`unknown command ${command}`);
}
