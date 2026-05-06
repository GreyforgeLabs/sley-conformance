import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConformance, requireCoverage } from "../src/index.mjs";

const root = mkdtempSync(join(tmpdir(), "sley-conf-"));
mkdirSync(join(root, "fixtures/corpus"), { recursive: true });
mkdirSync(join(root, "fixtures/cli_smokes"), { recursive: true });
mkdirSync(join(root, "fixtures/contracts"), { recursive: true });
mkdirSync(join(root, "docs/schemas"), { recursive: true });
writeFileSync(join(root, "fixtures/corpus/manifest.json"), JSON.stringify({ accepted: [1], rejected: [1] }));
writeFileSync(join(root, "fixtures/cli_smokes/manifest.json"), JSON.stringify({ cases: [{ covers: ["cli:verify"] }] }));
writeFileSync(join(root, "fixtures/contracts/a.json"), "{}");
writeFileSync(join(root, "docs/schemas/a.schema.json"), "{}");
const report = loadConformance(root);
if (!requireCoverage(report, "cli:verify").ok) throw new Error("missing coverage");
console.log("sley-conformance smoke ok");
