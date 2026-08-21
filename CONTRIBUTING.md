# Contributing to DiaryNote

First off, thank you for taking the time to contribute to **DiaryNote**! Contributions from the community help make DiaryNote a better spatial note-taking app for everyone.

Below is a set of guidelines and best practices to help you contribute effectively.

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and welcoming environment for everyone:
- Be welcoming, empathetic, and thoughtful in communications.
- Provide constructive feedback on pull requests and issues.
- Keep discussions focused on improving the software and user experience.

---

## How to Contribute

### 1. Reporting Bugs
Before opening a new bug report, please search existing GitHub Issues to avoid duplicates. When filing a bug report:
- Use a clear, descriptive title.
- List exact steps to reproduce the issue.
- Include details about your OS (Linux, macOS, Windows), Environment (Web / Desktop), and Version (`v0.1.1`).
- Include screenshots or error traceback logs if available.

### 2. Proposing Features
Have an idea to make DiaryNote even better? Feature requests are always welcome!
- Describe the problem or workflow your feature addresses.
- Outline your proposed solution clearly.
- Consider how the feature fits with spatial canvas navigation and local-first security.

### 3. Submitting Pull Requests (PRs)
- **Branch Naming Conventions**:
  - `feat/feature-name` (New features)
  - `fix/bug-fix-name` (Bug fixes)
  - `docs/documentation-update` (Documentation changes)
  - `refactor/component-cleanup` (Code refactoring)
- **Focused PRs**: Keep pull requests focused on a single feature or bug fix.

---

## Local Development Setup

### Prerequisites
- **Bun**: `v1.2+`
- **Rust Toolchain**: `rustc` & `cargo` (required for native desktop Tauri builds)

### Setup Steps

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/DiaryNote.git
   cd DiaryNote
   ```

2. **Install Dependencies**:
   ```bash
   bun install
   ```

3. **Run Web Dev Server**:
   ```bash
   bun run dev
   ```
   Open your browser at `http://localhost:3000`.

4. **Run Desktop Dev Mode (Tauri)**:
   ```bash
   bun run tauri:dev
   ```

---

## Quality Gates & Verification

Before submitting a Pull Request, verify that all type checking and production builds pass cleanly without warnings:

```bash
# Typecheck TypeScript definitions
bun run lint

# Verify Production Web Build
bun run build
```

---

## Code Conventions & Design System Rules

- **TypeScript Type Safety**: Avoid `any` types. Place shared interfaces in `src/types/index.ts` or component `types.ts`.
- **UI Design System Tokens**:
  - **Corner Radius**: Standardize on `rounded-md` (or `rounded-sm` for small badges). Avoid `rounded-2xl`.
  - **Shadows**: Use subtle `shadow-sm` for cards, popovers, and controls.
  - **Color Tokens**:
    - Light mode: `bg-white/95 border-slate-200 text-slate-800 shadow-sm`
    - Dark mode: `bg-slate-900/90 border-slate-800 text-slate-200 shadow-sm`
- **Commit Messages**: Follow [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat(ui): add new keyboard shortcuts cheatsheet`
  - `fix(group): resolve dynamic overlap bounds`
  - `docs(readme): add contributing guide link`

---

## Releasing a New Version

DiaryNote uses automated release workflows. **`package.json` is the single source of truth** for the version number — all other version fields are synced from it.

### Version sync commands

```bash
# Sync Cargo.toml and tauri.conf.json from package.json
bun run version:sync

# Verify all version files match (also runs in CI on every PR)
bun run version:check

# Set a specific version everywhere at once
bun run version:set 0.1.3
```

### Recommended release process

1. **Write release notes** at `.github/releases/RELEASE_NOTES_vX.Y.Z.md` (or `.github/releases/RELEASE_NOTES_vX.Y.Z-beta.N.md`).
2. **Run Prepare Release** workflow: Actions → Prepare Release → enter version `X.Y.Z` or `X.Y.Z-beta.N` (no `v` prefix). Select your target branch (e.g. `main` for stable, `feature/*` for pre-release).
3. The workflow will:
   - Bump and sync the version across all files
   - Commit, tag `vX.Y.Z` or `vX.Y.Z-beta.N`, and push
   - Trigger the **Release Multi-Platform Binaries** workflow automatically
4. Wait for the release workflow to finish on all platforms (Linux, macOS, Windows).
5. Verify the [GitHub Releases](https://github.com/itshimelz/DiaryNote/releases) page has your notes and downloadable assets.

### Pre-Release Conventions & Project Rules

DiaryNote enforces structured pre-release versioning rules:

1. **Sequential Versioning Target**: Pre-releases on non-main feature branches target the **next version increment** following the current `main` release.
   - *Example*: If `main` is at `v0.1.3`, the pre-release series for the upcoming release is `v0.1.4-beta.1`, `v0.1.4-beta.2`, etc.
2. **Beta Iteration Ceiling**: A maximum of **10 beta iterations** (`beta.1` through `beta.10`) are allowed per version cycle before promoting to stable release on `main`.
3. **Feature Branch Releases**: Pre-releases are released directly from active feature branches (`feature/*`) to isolate experimental builds from the stable `main` branch.

### Alternative: local bump and tag

```bash
bun run version:set 0.1.4-beta.1
cd src-tauri && cargo check && cd ..
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/Cargo.lock
git commit -m "chore(release): v0.1.4-beta.1"
git tag v0.1.4-beta.1
git push origin feature/ai-note-merging --tags
```

The release workflow validates that version files match the tag and that the release notes file exists before building. A mismatch will fail the workflow before any platform build starts.

---

## License Notice

By contributing to DiaryNote, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
