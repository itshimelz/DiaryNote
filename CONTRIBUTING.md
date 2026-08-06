# Contributing to DiaryNote

First off, thank you for taking the time to contribute to **DiaryNote**! Contributions from the community help make DiaryNote a better spatial note-taking app for everyone.

Below is a set of guidelines and best practices to help you contribute effectively.

---

## 📜 Code of Conduct

By participating in this project, you agree to maintain a respectful and welcoming environment for everyone:
- Be welcoming, empathetic, and thoughtful in communications.
- Provide constructive feedback on pull requests and issues.
- Keep discussions focused on improving the software and user experience.

---

## 🚀 How to Contribute

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

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js**: `v18+` or `v20+` / `bun`
- **npm** or **bun**
- **Rust Toolchain**: `rustc` & `cargo` (required for native desktop Tauri builds)

### Setup Steps

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/DiaryNote.git
   cd DiaryNote
   ```

2. **Install Dependencies**:
   ```bash
   npm install   # or bun install
   ```

3. **Run Web Dev Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

4. **Run Desktop Dev Mode (Tauri)**:
   ```bash
   npm run tauri:dev
   ```

---

## 🧪 Quality Gates & Verification

Before submitting a Pull Request, verify that all type checking and production builds pass cleanly without warnings:

```bash
# Typecheck TypeScript definitions
npm run lint

# Verify Production Web Build
npm run build
```

---

## 🎨 Code Conventions & Design System Rules

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

## 📄 License Notice

By contributing to DiaryNote, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
