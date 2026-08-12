# DiaryNote Release & Pre-Release Conventions

This document establishes the official project rules for software releases, pre-releases, versioning schemas, and automation.

---

## 1. Versioning Standard

DiaryNote uses **Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH[-PRERELEASE]`).

- **Stable Release Source**: `main` branch.
- **Pre-Release Source**: Feature branches (`feature/*`).
- **Single Source of Truth**: `package.json` (`version` field).
  - Version numbers across `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` must always be kept strictly in sync via `node scripts/sync-version.mjs`.

---

## 2. Pre-Release Naming & Version Rules

When cutting a pre-release from a non-main feature branch:

1. **Target Version Determination**:
   The pre-release version must always target the **next incremental release version** following the current stable version on `main`.
   - *Rule*: If `main` is at `v0.1.3`, pre-releases for the upcoming release cycle are named `v0.1.4-beta.1`, `v0.1.4-beta.2`, ..., `v0.1.4-beta.10`.

2. **Beta Versioning Format**:
   - Pre-release tag pattern: `vX.Y.Z-beta.N` where `N` is an integer starting from `1`.
   - Example progression: `v0.1.4-beta.1` → `v0.1.4-beta.2` → ... → `v0.1.4-beta.10`.

3. **Beta Iteration Ceiling**:
   - **Maximum Beta Iteration**: `beta.10`.
   - No feature branch may exceed `beta.10`. Prior to or upon reaching `beta.10`, the branch must be merged into `main` and released as a stable version (`vX.Y.Z`).

---

## 3. Pre-Release Artifact & Installer Rules

1. **GitHub Releases Badge**:
   - All tags containing a hyphen (`-`) are automatically designated as **Pre-release** on GitHub.
   - Pre-releases do not replace or override the "Latest Release" badge of standard releases.

2. **Installer Behavior (`install.sh` & `install.ps1`)**:
   - Interactive runs prompt the user to choose between stable releases and pre-releases.
   - Command-line flags `--version <tag>` and `--prerelease` allow targeted pre-release installations.
   - Non-interactive / headless runs default to the latest stable release.

3. **Windows Installer Bundling (NSIS vs. MSI)**:
   - WiX (MSI) enforces strict Windows Installer requirements: version strings for `.msi` targets must be numeric-only (`MAJOR.MINOR.PATCH[.BUILD]`).
   - For pre-releases containing string identifiers (e.g. `v0.1.4-beta.1`), the GitHub workflow automatically passes `--bundles nsis` on Windows to generate the standard `.exe` setup installer, bypassing WiX `.msi` validation errors.
   - Stable releases (`vX.Y.Z`) build both `.exe` (NSIS) and `.msi` (WiX) installers.

---

## 4. Release Checklist

For every pre-release `vX.Y.Z-beta.N`:

- [ ] Release notes file exists at `.github/releases/RELEASE_NOTES_vX.Y.Z-beta.N.md`.
- [ ] Version is set via `node scripts/sync-version.mjs --set X.Y.Z-beta.N`.
- [ ] Version validation passes cleanly via `node scripts/sync-version.mjs --check`.
- [ ] `Cargo.lock` is refreshed via `cd src-tauri && cargo check`.
- [ ] Tag `vX.Y.Z-beta.N` is pushed to feature branch.
