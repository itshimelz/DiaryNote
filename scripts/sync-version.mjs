#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = join(root, "package.json");
const cargoTomlPath = join(root, "src-tauri/Cargo.toml");
const tauriConfPath = join(root, "src-tauri/tauri.conf.json");

const SEMVER_RE = /^\d+\.\d+\.\d+(-[\w.-]+)?$/;

function readPackageVersion() {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  if (!pkg.version || !SEMVER_RE.test(pkg.version)) {
    console.error(`Invalid or missing version in ${packageJsonPath}`);
    process.exit(1);
  }
  return pkg.version;
}

function readCargoVersion() {
  const content = readFileSync(cargoTomlPath, "utf8");
  const match = content.match(/^version\s*=\s*"([^"]+)"/m);
  if (!match) {
    console.error(`Could not find version in ${cargoTomlPath}`);
    process.exit(1);
  }
  return match[1];
}

function readTauriConfVersion() {
  const conf = JSON.parse(readFileSync(tauriConfPath, "utf8"));
  if (!conf.version) {
    console.error(`Missing version in ${tauriConfPath}`);
    process.exit(1);
  }
  return conf.version;
}

function writePackageVersion(version) {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  pkg.version = version;
  writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function writeCargoVersion(version) {
  const content = readFileSync(cargoTomlPath, "utf8");
  const updated = content.replace(
    /^version\s*=\s*"[^"]+"/m,
    `version = "${version}"`,
  );
  writeFileSync(cargoTomlPath, updated);
}

function writeTauriConfVersion(version) {
  const conf = JSON.parse(readFileSync(tauriConfPath, "utf8"));
  conf.version = version;
  writeFileSync(tauriConfPath, `${JSON.stringify(conf, null, 2)}\n`);
}

function syncFromPackageJson(version) {
  writeCargoVersion(version);
  writeTauriConfVersion(version);
  console.log(`Synced version ${version} to Cargo.toml and tauri.conf.json`);
}

const args = process.argv.slice(2);

if (args[0] === "--check") {
  const pkgVersion = readPackageVersion();
  const cargoVersion = readCargoVersion();
  const tauriVersion = readTauriConfVersion();
  const mismatches = [];

  if (cargoVersion !== pkgVersion) {
    mismatches.push(`Cargo.toml (${cargoVersion}) != package.json (${pkgVersion})`);
  }
  if (tauriVersion !== pkgVersion) {
    mismatches.push(`tauri.conf.json (${tauriVersion}) != package.json (${pkgVersion})`);
  }

  if (mismatches.length > 0) {
    console.error("Version mismatch detected:");
    for (const msg of mismatches) {
      console.error(`  - ${msg}`);
    }
    console.error("\nRun: bun run version:sync");
    process.exit(1);
  }

  console.log(`All version files match: ${pkgVersion}`);
  process.exit(0);
}

if (args[0] === "--set") {
  const version = args[1];
  if (!version || !SEMVER_RE.test(version)) {
    console.error("Usage: node scripts/sync-version.mjs --set X.Y.Z");
    process.exit(1);
  }
  writePackageVersion(version);
  syncFromPackageJson(version);
  process.exit(0);
}

const version = readPackageVersion();
syncFromPackageJson(version);
