# Yukti AI Assistant

# YUKTI — Full Lovable Build Prompt

Paste everything below this line into Lovable as your first prompt.

---

Build a complete web application called **Yukti** — a developer tool that takes LLM output (from Claude, ChatGPT, Gemini, or any AI) and automatically applies the suggested code changes to the user's actual project files.

---

## TECH STACK

- React + Vite + Tailwind CSS
- Framer Motion for all animations
- Monaco Editor (@monaco-editor/react) for the code editor
- Firebase Authentication (email/password)
- Firebase Firestore (project state, chat history)
- Firebase Storage (uploaded files and ZIPs)
- react-dropzone for drag and drop
- JSZip for ZIP parsing
- Geist font from Vercel CDN

---

## DESIGN SYSTEM — FOLLOW EXACTLY, NO DEVIATIONS

```
Background:        #0d0b14 to #110e1a (dark with subtle purple tint)
Surface cards:     #1a1625
Borders:           #2a2440
Accent primary:    #8b5cf6 (soft purple)
Accent light:      #a78bfa
Success:           #10b981 (emerald)
Warning:           #f59e0b (amber)
Error:             #f43f5e (rose)
Text primary:      #f1f0f5
Text secondary:    #8b87a0
Font:              Geist (import from https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap)
Border radius:     12px on cards, 8px on inputs and buttons
Box shadow:        rgba(139, 92, 246, 0.15) for purple-tinted depth
```

**NEVER use gold, yellow-gold, orange-gold, or any generic AI startup colors. Never use white backgrounds. Never use plain grey spinners.**

Overall feel: 40% Linear + 30% Arc Browser + 20% Cursor + 10% Apple VisionOS. Clean, spatial, premium, interactive. Everything feels alive — nothing static or instant without animation.

---

## PAGES TO BUILD

---

### PAGE 1: LANDING PAGE (`/`)

**Layout:** Full screen dark hero. No scrolling required on first load — everything visible in viewport.

**Background:** Animated aurora gradient shifting slowly in purple tones (#0d0b14, #1a0a2e, #0f0a1e). Use CSS keyframe animation to move this gradient slowly. Alternatively add subtle floating particles using a canvas element with small purple/white dots drifting upward.

**Center content (vertically and horizontally centered):**

1. Small geometric logo mark above the wordmark — a simple abstract shape made of two overlapping angular lines in #8b5cf6, approximately 40x40px
2. Wordmark: "Yukti" in Geist font, weight 600, size 56px, color #f1f0f5, letter-spacing -1px
3. Tagline directly below: "What the AI told you. Applied." — Geist, weight 400, size 20px, color #8b87a0
4. **Live demo animation block** (described in full detail below)
5. Two CTA buttons side by side with 16px gap:
   - "Get Started" — filled, background #8b5cf6, text white, border-radius 8px, padding 12px 28px, font-weight 500. On hover: scale 1.02, box-shadow 0 0 20px rgba(139,92,246,0.4)
   - "See How It Works" — ghost outline, border 1px solid #2a2440, text #8b87a0, same sizing. On hover: border-color #8b5cf6, text #f1f0f5

**Live Demo Animation Block:**
This is a looping animation showing Yukti working. Build it as a contained panel approximately 680px wide, 260px tall, centered below the tagline and above the CTAs.

It has two side-by-side panes with a 20px gap:
- Left pane (280px): Mock LLM output panel — dark surface #1a1625, border #2a2440, border-radius 12px, padding 16px. Shows mock text like "Replace the `calculateTotal` function with this updated version:" followed by a small code block. Label at top: "Claude output" in tiny uppercase #8b87a0
- Right pane (360px): Mock Monaco editor panel — same surface, shows a JavaScript file with syntax-colored lines, line numbers on left in #8b87a0

**Animation sequence (loop every 5 seconds):**

Step 1 (0–0.5s): Three lines of instruction text in the left pane glow and a subtle arrow/beam animates from left pane rightward toward the editor

Step 2 (0.5–1s): Editor auto-scrolls (translate Y animation on the text inside) to reveal a specific function — `calculateTotal` — and that line gets a soft blue glow background (#1e3a5f with blue border-left 3px solid #3b82f6)

Step 3 (1–2.5s): Old code lines in editor get a red-tinted background (#2d1515) and fade to opacity 0. New code appears character by character with a blinking cursor (CSS animation, cursor blinks at 530ms interval)

Step 4 (2.5–3s): A green checkmark icon (Lucide CheckCircle) pulses in with spring scale animation from 0 to 1 in the line gutter

Step 5 (3–3.5s): A diff panel slides up from the bottom of the right pane — two rows, one red (removed line), one green (added line), with line numbers

Step 6 (3.5–4s): Everything holds. Green state.

Step 7 (4–5s): Smooth fade and reset for next loop

**Footer (bottom of page, minimal):**
Single line of text centered: "Yukti · Built for developers who use AI" — Geist 13px, color #8b87a0

---

### PAGE 2: LOGIN / SIGNUP (`/login`)

**Layout:** Full screen with same aurora background as landing page. Centered card.

**Card:**
- Width 420px
- Background: rgba(26, 22, 37, 0.8)
- backdrop-filter: blur(20px)
- border: 1px solid #2a2440
- border-radius: 12px
- padding: 40px
- box-shadow: 0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(139,92,246,0.1)

**Card contents:**
- Yukti logo mark + wordmark at top, centered, smaller version (32px wordmark)
- Below: tab toggle between "Sign In" and "Sign Up" — two text buttons, active one has #8b5cf6 underline and #f1f0f5 color, inactive is #8b87a0
- Smooth fade + slight Y-translate transition when switching between modes
- Email input: full width, background #0d0b14, border 1px solid #2a2440, border-radius 8px, padding 12px 16px, text #f1f0f5, placeholder #8b87a0. On focus: border-color #8b5cf6, box-shadow 0 0 0 3px rgba(139,92,246,0.15)
- Password input: same styling, with eye icon (Lucide Eye/EyeOff) on right to toggle visibility
- Sign In button / Create Account button: full width, background #8b5cf6, text white, border-radius 8px, padding 14px, font-weight 500, font-size 15px. On hover: background #7c3aed, box-shadow 0 0 20px rgba(139,92,246,0.35). Loading state: show spinner (small white spinning circle), button text changes to "Signing in..." and button is disabled
- Error messages: small rose-colored text (#f43f5e) below the relevant field, fade in with opacity animation
- Firebase Authentication integration: connect email/password sign in and sign up. On success redirect to `/dashboard`

---

### PAGE 3: DASHBOARD (`/dashboard`)

**Layout:** Full height, two areas — left sidebar + main content area.

**Top navbar (full width, height 56px):**
- Background #0d0b14, border-bottom 1px solid #2a2440
- Left: Yukti logo mark + wordmark (same as auth page size)
- Right: User avatar circle (first letter of email, background #2a2440, text #f1f0f5, 32px circle) + email text in #8b87a0 + dropdown chevron. Dropdown on click: shows "Sign out" option

**Left sidebar (240px wide, full height minus navbar):**
- Background #0d0b14, border-right 1px solid #2a2440
- "New Project" button at top: full width minus 24px padding on sides, border 1px solid #2a2440, border-radius 8px, text "+ New Project" in #8b87a0, background transparent. On hover: border-color #8b5cf6, text #f1f0f5
- Below: list of saved projects. Each item:
  - Height 44px, border-radius 8px, padding 0 12px
  - Project name in #f1f0f5 (14px), last modified date in #8b87a0 (12px) below
  - Colored dot on left based on status (emerald = active, amber = has pending changes, grey = no changes)
  - On hover: background #1a1625
  - Active/selected: background rgba(139, 92, 246, 0.15), left border 2px solid #8b5cf6
- Sidebar items animate in from left (translateX -20px to 0) with staggered delay of 60ms per item on first load

**Main content area:**
- Empty state when no project selected: centered vertically and horizontally
  - Soft abstract illustration (SVG) — a simple stylized folder or file icon with subtle purple glow
  - Text: "Drop your first project to get started" — Geist 18px, #8b87a0
  - Subtext: "Upload a ZIP file or individual code files to begin" — 14px, #8b87a0 with lower opacity
- When project selected: redirect to `/project/:projectId`

---

### PAGE 4: PROJECT WORKSPACE (`/project/:projectId`)

**Layout:** Three columns, full height, minus 56px navbar (same navbar as dashboard).

---

**LEFT COLUMN — File Tree (220px, fixed)**

- Background #0d0b14, border-right 1px solid #2a2440
- Top: project name in #f1f0f5 (14px, font-weight 500), file count badge (small pill, background #2a2440, text #8b87a0, e.g. "24 files")
- File tree below: collapsible folders, indented children
- File icons based on extension — use Lucide icons or simple colored dots: .js/.ts = yellow dot, .py = blue dot, .css = purple dot, .json = grey dot, .md = white dot
- Active file: background rgba(139,92,246,0.15), text #f1f0f5
- Inactive: text #8b87a0, on hover text #f1f0f5, background #1a1625
- Bottom of sidebar: two small stat pills
  - "✓ 3 applied" in emerald
  - "⏳ 1 pending" in amber

---

**CENTER COLUMN — Code Editor (flex 1, fills remaining space)**

- Monaco Editor filling the full column height
- Theme: custom dark theme matching the app — background #0d0b14, line numbers #8b87a0, text #f1f0f5, keywords #a78bfa, strings #10b981, comments #8b87a0
- When a change is being applied, the following animation sequence plays:

  1. Editor programmatically calls `revealLineInCenter(targetLine)` to smoothly scroll to the target function
  2. A decoration is added to the target line: background rgba(30, 58, 138, 0.3), left border 3px solid #3b82f6 — this pulses with a CSS keyframe opacity animation (0.6 to 1.0, 800ms, ease-in-out, infinite) for 1.5 seconds
  3. Lines being removed get background rgba(239, 68, 68, 0.15) decoration, then fade out over 400ms
  4. New code is inserted character by character — update Monaco editor content with a setInterval of 18ms per character, adding one character at a time to the insertion point. A blinking cursor decoration follows the last inserted character (CSS animation 530ms blink)
  5. After all characters are typed, the blue pulse decoration is replaced by a green gutter icon (checkmark rendered as a Monaco glyph decoration) that scales in with a spring animation
  6. All decorations clear after 3 seconds, editor returns to normal state

---

**RIGHT COLUMN — Instruction Panel (320px, fixed)**

- Background #0d0b14, border-left 1px solid #2a2440
- Padding 20px

**Top section — Instruction input:**
- Label: "LLM Output" in #8b87a0, 12px uppercase, letter-spacing 0.08em
- Textarea below: full width, min-height 180px, background #1a1625, border 1px solid #2a2440, border-radius 8px, padding 14px, font-family monospace, font-size 13px, text #f1f0f5, placeholder "Paste what Claude, ChatGPT, or any AI told you..." in #8b87a0. On focus: border-color #8b5cf6, box-shadow 0 0 0 3px rgba(139,92,246,0.12)
- Resize: vertical only

**Mode tabs:**
- Two tabs below the textarea: "Manual" and "Auto (AI)"
- Tab style: pill-shaped, inactive = background #1a1625, text #8b87a0. Active = background rgba(139,92,246,0.2), text #a78bfa, border 1px solid #8b5cf6
- Smooth background transition on tab switch

**Manual Mode content:**
- "Apply Instructions" button: full width, background #8b5cf6, text white, border-radius 8px, padding 12px, font-weight 500. On hover: scale 1.02, box-shadow 0 0 20px rgba(139,92,246,0.35)
- Processing animation (described below) appears inline here when Apply is clicked

**Auto Mode content:**
- API key input: full width, type password, with eye toggle icon, background #1a1625, border #2a2440, same focus styling. Placeholder: "sk-ant-..." Label above: "Claude API Key" in #8b87a0 12px. Below: "Your key is stored securely in your account" in #8b87a0 11px
- Below that: full chat interface
  - Chat message list: scrollable, flex-col, gap 12px
  - User messages: aligned right, background rgba(139,92,246,0.2), border 1px solid #8b5cf6, border-radius 12px 12px 2px 12px, padding 10px 14px, text #f1f0f5, max-width 80%
  - Yukti messages: aligned left, background #1a1625, border 1px solid #2a2440, border-radius 12px 12px 12px 2px, padding 10px 14px, text #f1f0f5, max-width 80%
  - Input bar at bottom: text input + send button (arrow icon, #8b5cf6)
  - Chat history saved to Firestore per project

**Processing Animation (inline in right panel, Manual Mode):**

When Apply is clicked, show this animated step-by-step sequence replacing the button temporarily:

```
📂  Reading project files...
    [████████████░░] 92%
✔   184 files indexed
────────────────────
🤖  Parsing instructions...
    [██████░░░░░░░░]
✔   3 changes found
────────────────────
🔍  Searching for anchor points...
✔   Found
────────────────────
📐  Checking indentation...
✔   Correct
────────────────────
🔧  Generating diff...
✔   Ready to apply
```

Each step animates in sequentially with 600ms delay between steps. Checkmarks (✔) pop in with a spring scale animation (scale 0 → 1.2 → 1.0). Progress bars fill from left to right with a smooth width transition. Nothing appears all at once. After all steps complete, the diff preview slides up from the bottom.

**Diff Preview Panel:**

Slides up from bottom of right column (translateY 100% → 0, spring animation) when changes are ready:
- Header: "Review Changes" in #f1f0f5, 14px, with file name
- Rows: alternating removed lines (background #2d1515, text #f87171, left border 3px solid #f43f5e, prefixed with "−") and added lines (background #0d2115, text #6ee7b7, left border 3px solid #10b981, prefixed with "+"). Line numbers shown on left in #8b87a0
- Two buttons at bottom: "Apply Changes" (#8b5cf6 filled) and "Discard" (ghost)
- Undo button appears after applying: "↩ Undo last change" in #8b87a0, text button

---

### SCREEN OVERLAY: DRAG AND DROP UPLOAD

Trigger: user drags any file anywhere over the browser window.

**Do NOT make this a tiny dashed box. The entire screen reacts.**

- `window` level dragover event listener
- When triggered: entire app background blurs (filter: blur(4px) on the main content, pointer-events none)
- Full screen overlay appears from opacity 0 to 1, background rgba(13, 11, 20, 0.85), z-index 9999
- Center of overlay:
  - Large upload icon (Lucide UploadCloud, size 64px) in #8b5cf6, pulsing gently with scale 1.0 → 1.06 → 1.0 animation loop
  - Text: "Drop your project here" — Geist 24px, #f1f0f5, font-weight 500
  - Subtext: "ZIP file or individual code files" — 14px, #8b87a0
  - Dashed border rect centered (400px × 260px), border: 2px dashed #8b5cf6, border-radius 16px, nothing inside it except the above content
- When file is dropped:
  - Upload icon morphs into a Lucide CheckCircle with a spring scale animation (scale 0 → 1.3 → 1.0), color transitions from #8b5cf6 to #10b981
  - Text changes to "Got it! Processing..."
  - Overlay fades out after 800ms
  - Processing begins: JSZip parses ZIP if ZIP file, extracts all files, builds file tree structure, uploads to Firebase Storage, saves project metadata to Firestore

---

### SCREEN OVERLAY: AMBIGUITY DETECTION UI

Trigger: Yukti detects that an instruction maps to multiple possible targets (e.g., two functions with same name).

**Do NOT simplify this to a plain dialog. This is a key differentiator of the product.**

- Center editor column dims to 30% opacity (filter: brightness(0.3))
- Two "conflict cards" appear overlaid on the center column, positioned roughly at 1/3 and 2/3 height:
  - Each card: background #1a1625, border 1px solid #2a2440, border-radius 12px, padding 20px, width 320px
  - Card header: filename + line number in #8b87a0 12px (e.g. "main.py · Line 45")
  - Code block below: monospace, syntax-highlighted, showing the conflicting function, background #0d0b14, border-radius 8px, padding 12px, max 8 lines visible
  - Cards animate in from opacity 0, scale 0.92 → 1.0, spring animation, staggered 150ms
- Animated dashed lines: SVG absolutely positioned, draws animated dashed lines from the instruction textarea in the right panel to both conflict cards. Animate the SVG stroke-dashoffset to make dashes appear to flow from right panel toward the cards
- Warning banner at top of screen (below navbar): background rgba(245,158,11,0.15), border-bottom 1px solid rgba(245,158,11,0.3), text "⚠️  Multiple possible targets found — which one did you mean?" in #f59e0b, height 44px, flex center, slides down from top
- Below the conflict cards, a "Clarification Prompt" box:
  - Label: "Copy this prompt and paste it into your LLM" in #8b87a0 12px
  - Text box with generated prompt text, background #0d0b14, border #2a2440, border-radius 8px, padding 14px, text #f1f0f5, read-only, font monospace 13px. Example generated text: "In file main.py, there are 2 functions named process_data at lines 45 and 112. Your instruction said to modify process_data but didn't specify which one. Please clarify which one and re-give the instruction with the exact line number and surrounding context."
  - "Copy Prompt" button in amber: background rgba(245,158,11,0.15), border 1px solid #f59e0b, text #f59e0b, border-radius 8px, padding 8px 16px. On click: copies text, button briefly shows "Copied ✓" in emerald
- Instructional text below: "Paste the clearer response back into Yukti to continue" — #8b87a0 13px, centered

---

## MICRO-ANIMATIONS — APPLY THROUGHOUT

- All buttons: scale 1.02 on hover (Framer Motion whileHover), purple glow shadow on focus
- Sidebar items: initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} with staggerChildren 0.06s in the parent container
- Page transitions: each route wraps content in `<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}`
- Toasts/notifications: slide in from top-right, auto-dismiss after 4000ms. Success toasts: emerald left border. Error toasts: rose left border. Warning: amber left border
- Success states: brief green pulse ripple that expands and fades (scale 1 → 2, opacity 1 → 0, 600ms)
- Loading states: skeleton loaders with a purple shimmer gradient animation (background: linear-gradient 90deg from #1a1625 via #2a2440 to #1a1625, animated background-position), never plain grey spinners
- All modals and overlays: Framer Motion AnimatePresence for enter/exit
- Checkmarks: always spring scale, never instant

---

## FIREBASE SETUP

Create and configure Firebase with:

1. **Authentication**: Email/password provider enabled
2. **Firestore collections**:
   - `users/{userId}/projects/{projectId}` — stores: projectName, fileCount, lastModified, status, appliedChanges, pendingChanges
   - `users/{userId}/projects/{projectId}/chatHistory` — array of {role, content, timestamp} for Auto mode
   - `users/{userId}/settings` — stores: apiKey (encrypted), preferences
3. **Storage**: `users/{userId}/projects/{projectId}/files/` — stores uploaded files and ZIPs
4. Session persistence: Firebase `setPersistence(browserLocalPersistence)` so users stay logged in across sessions and browser closes

---

## ROUTING

- `/` — Landing page
- `/login` — Login/Signup
- `/dashboard` — Dashboard (protected, requires auth)
- `/project/:projectId` — Project workspace (protected, requires auth)
- Unauthenticated users hitting protected routes redirect to `/login`
- Authenticated users hitting `/login` redirect to `/dashboard`

---

## COMPONENT NOTES

- Use `@monaco-editor/react` package for Monaco integration
- Monaco editor theme should be defined as a custom theme object using `monaco.editor.defineTheme()` matching the app's color system exactly
- Use `react-dropzone` for the drag and drop, but make the drop zone the entire window, not a contained component
- Use `JSZip` for ZIP parsing — read the zip, iterate entries, filter out `__MACOSX` and `.DS_Store`, build a nested tree object from file paths
- Framer Motion `AnimatePresence` must wrap all conditional renders that animate in/out
- Do not use any component library (no shadcn, no MUI, no Chakra) — build all UI primitives from scratch using Tailwind
- All icons from `lucide-react`
- Do not use any placeholder images — all empty states use SVG illustrations built inline

---

## FILE STRUCTURE TO GENERATE

```
src/
  components/
    layout/
      Navbar.jsx
      Sidebar.jsx
    editor/
      MonacoEditor.jsx
      DiffViewer.jsx
    panels/
      FileTree.jsx
      InstructionPanel.jsx
      ProcessingAnimation.jsx
    overlays/
      DragDropOverlay.jsx
      AmbiguityOverlay.jsx
    ui/
      Button.jsx
      Input.jsx
      Toast.jsx
      SkeletonLoader.jsx
  pages/
    Landing.jsx
    Login.jsx
    Dashboard.jsx
    ProjectWorkspace.jsx
  lib/
    firebase.js
    firestore.js
    storage.js
    zipParser.js
    instructionParser.js
    fuzzyMatcher.js
  hooks/
    useAuth.js
    useProject.js
    useToast.js
  App.jsx
  main.jsx
```

---

Build the complete application end to end. Every page, every overlay, every animation, every Firebase integration. Do not skip any section of this prompt. Do not use placeholder grey boxes — build the real UI. Do not use generic loading spinners — use the purple shimmer skeleton loaders described. The product should feel premium, alive, and crafted.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1f318d96-e0cc-44cb-8f22-60f65da66edd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
