# 💡 Feature Refinement: AI Note Merging with Encrypted API Key Storage

## 🎯 Problem Statement
**"How might we enable users to securely provide their own AI API key (encrypted locally), toggle AI features on/off, and synthesize up to 5 canvas notes into one structured note via a button or shortcut?"**

---

## 🔒 1. API Key Security & Storage Architecture

1. **Local AES-GCM Encryption**:
   - The user's API Key (e.g. Gemini / OpenAI) is encrypted using **Web Crypto API (AES-GCM-256)** before writing to storage.
   - Key masking in UI: `sk-proj-••••••••••••`.
   - Never sent to third-party telemetry; sent ONLY directly to the official provider endpoint (e.g., `generativelanguage.googleapis.com` or `api.openai.com`).

2. **App Settings Extension (`src/lib/storage.ts`)**:
   ```typescript
   export interface AppSettings {
     // Existing settings...
     enableAIServices?: boolean;
     aiProvider?: 'gemini' | 'openai';
     encryptedApiKey?: string;
     apiKeyIv?: string; // Initialization vector for AES-GCM
   }
   ```

---

## 🎨 2. UI & Interaction Design

### A. Settings & Toggle (`SecurityModal.tsx` or AI Settings Panel)
- **Toggle**: `[x] Enable AI Services & Features`
- **Provider Selector**: `[ Gemini API | OpenAI API | OpenRouter | Custom/OpenAI-Compatible (DeepSeek, Qwen, Moonshot) ]`
- **Key Input**: Password-masked input field with `[Test Connection]` and `[Save Encrypted Key]`.
- **Custom Base URL**: Optional input for OpenRouter/DeepSeek/Custom OpenAI-compatible endpoints (`https://openrouter.ai/api/v1`, `https://api.deepseek.com`, etc.).

### B. Canvas & Batch Action Controls (`BatchActionBar.tsx` & `CanvasControls.tsx`)
- When `enableAIServices` is `true`:
  - Selecting 2 to 5 notes on the infinite canvas surfaces a new action button in [`BatchActionBar`](file:///home/itshimelz/Projects/DiaryNote/src/components/BatchActionBar.tsx):
    `[ ✨ Merge with AI (Shift + M) ]`
  - If > 5 notes are selected, button shows disabled state with tooltip: *"Select up to 5 notes for AI merge"*.

---

## 🧠 3. Synthesis & Merge Flow

1. **User Action**: Selects 2-5 notes and clicks `✨ Merge with AI` (or presses `Shift + M`).
2. **Loading State**: Selected cards display a subtle glowing pulse while AI synthesizes.
3. **Prompt Construction**:
   ```text
   You are an expert note synthesis assistant. 
   Combine the following {N} notes into a single, cohesive, well-formatted Markdown note.
   Use clear section headers, preserve key details, and summarize actionable checklist items at the bottom.

   --- SOURCE NOTES ---
   [Note 1: {title}]
   {content}

   [Note 2: {title}]
   {content}
   ```
4. **Placement & References**:
   - The original source notes remain intact on the canvas.
   - The newly generated merged note is created at the center position `(avgX, avgY)` of the source notes with `isPinned: true`.
   - At the bottom of the new merged note, a references section is automatically appended:
     ```markdown
     ---
     **Merged from:**
     - @Note 1 Title
     - @Note 2 Title
     ```

---

## 📋 4. Key Assumptions & MVP Scope

### MVP Scope (In):
- [x] Secure local AES-GCM key encryption in `localStorage`/IndexedDB.
- [x] Settings toggle (`enableAIServices`).
- [x] Integration with Google Gemini API (`gemini-1.5-flash` / `gemini-2.0-flash` - fast & free tier available).
- [x] Max 5 note selection enforcement in `BatchActionBar`.
- [x] `Shift + M` keybind.
- [x] New merged note placement on canvas.

### Not Doing in MVP (Out for now):
- [ ] Auto-deleting source notes after merge (source notes are preserved for safety).
- [ ] Custom system prompt editor (uses built-in optimized prompt).
- [ ] Fine-grained streaming response animation inside card (shows clean loading state until complete).

---

## ❓ 5. Clarifying Questions for You

1. **Default AI Provider**: Do you prefer **Google Gemini API** (which has a free API tier) as the default provider, or **OpenAI API**?
2. **Source Notes Behavior**: When the new merged note is created, should the original 5 notes remain on the canvas, or would you like an option to group them together inside a [`GroupFrame`](file:///home/itshimelz/Projects/DiaryNote/src/components/GroupFrame.tsx)?
