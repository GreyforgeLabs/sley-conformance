import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function listManifest(path) {
  return existsSync(path) ? readJson(path) : null;
}

export function listJsonFiles(root, predicate = () => true) {
  const sourceRoot = resolve(root);
  if (!existsSync(sourceRoot)) return [];
  return readdirSync(sourceRoot)
    .filter(predicate)
    .filter((file) => file.endsWith(".json"))
    .map((file) => join(sourceRoot, file))
    .filter((path) => statSync(path).isFile())
    .sort();
}

export function loadConformance(root) {
  const rootPath = resolve(root);
  const corpus = listManifest(join(rootPath, "fixtures/corpus/manifest.json"));
  const smoke = listManifest(join(rootPath, "fixtures/cli_smokes/manifest.json"));
  const schemas = listJsonFiles(join(rootPath, "docs/schemas"), (file) => file.endsWith(".schema.json"));
  const contracts = listJsonFiles(join(rootPath, "fixtures/contracts"), () => true);
  const smokeTags = new Map();

  for (const testCase of smoke?.cases ?? []) {
    for (const tag of testCase.covers ?? []) {
      smokeTags.set(tag, (smokeTags.get(tag) ?? 0) + 1);
    }
  }

  const contractSchemas = new Set();
  for (const contractPath of contracts) {
    try {
      const contract = readJson(contractPath);
      if (typeof contract.schema === "string") {
        contractSchemas.add(contract.schema);
      }
    } catch {
      // ignore malformed fixtures in summary mode
    }
  }

  const manifestSchemaIds = new Set();
  for (const path of schemas) {
    try {
      const schema = readJson(path);
      if (typeof schema.$id === "string") manifestSchemaIds.add(schema.$id);
    } catch {
      // ignore
    }
  }

  const missingReferences = [...contractSchemas].filter((schema) => !manifestSchemaIds.has(schema));

  return {
    schema: "sley.conformance.report.v0",
    root: rootPath,
    corpus: {
      accepted: corpus?.accepted?.length ?? 0,
      rejected: corpus?.rejected?.length ?? 0,
      valid: Array.isArray(corpus?.accepted) && Array.isArray(corpus?.rejected),
    },
    smoke: {
      cases: smoke?.cases?.length ?? 0,
      tag_count: smokeTags.size,
      tags: Object.fromEntries([...smokeTags.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
      valid: Array.isArray(smoke?.cases),
    },
    schemas: {
      count: schemas.length,
      files: schemas.map((name) => name.replace(rootPath, "")),
      schemaIds: [...manifestSchemaIds].sort(),
    },
    contracts: {
      count: contracts.length,
      files: contracts.map((name) => name.replace(rootPath, "")),
      schemaRefs: [...contractSchemas].sort(),
      missingSchemaRefs: missingReferences.sort(),
    },
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

export function requireCoverageThreshold(report, tag, minimum) {
  const minimumValue = minimum < 0 ? 1 : minimum;
  const count = report.smoke.tags[tag] ?? 0;
  return {
    schema: "sley.conformance.coverage_threshold.v0",
    tag,
    minimum: minimumValue,
    count,
    ok: count >= minimumValue,
  };
}

export function reportHealth(report) {
  const totalContracts = report.contracts.count;
  const missingSchemaRefs = report.contracts.missingSchemaRefs.length;
  return {
    schema: "sley.conformance.health.v0",
    ok: totalContracts > 0 && missingSchemaRefs === 0 && report.schemas.count > 0 && report.smoke.valid && report.corpus.valid,
    issues: {
      totalContracts,
      missingSchemaRefs,
      smokeCases: report.smoke.cases,
      root: report.root,
    },
  };
}
