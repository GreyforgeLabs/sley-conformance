import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function loadConformance(root) {
  const corpus = readJson(join(root, "fixtures/corpus/manifest.json"));
  const smoke = readJson(join(root, "fixtures/cli_smokes/manifest.json"));
  const schemas = readdirSync(join(root, "docs/schemas")).filter((file) => file.endsWith(".schema.json"));
  const contracts = readdirSync(join(root, "fixtures/contracts")).filter((file) => file.endsWith(".json"));
  const smokeTags = new Map();
  for (const testCase of smoke.cases ?? []) {
    for (const tag of testCase.covers ?? []) {
      smokeTags.set(tag, (smokeTags.get(tag) ?? 0) + 1);
    }
  }
  return {
    schema: "sley.conformance.report.v0",
    root,
    corpus: {
      accepted: corpus.accepted?.length ?? 0,
      rejected: corpus.rejected?.length ?? 0,
    },
    smoke: {
      cases: smoke.cases?.length ?? 0,
      tag_count: smokeTags.size,
      tags: Object.fromEntries([...smokeTags.entries()].sort()),
    },
    schemas: { count: schemas.length, files: schemas.sort() },
    contracts: { count: contracts.length, files: contracts.sort() },
  };
}

export function requireCoverage(report, tag) {
  return {
    schema: "sley.conformance.coverage.v0",
    tag,
    ok: Boolean(report.smoke.tags[tag]),
    count: report.smoke.tags[tag] ?? 0,
  };
}
