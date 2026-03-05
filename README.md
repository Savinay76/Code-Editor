# CodeVault — High-Performance Code Editor

A browser-based code editor built with **React + Vite** that implements VS Code-style keyboard shortcuts, real-time event debugging, undo/redo history, and debounced syntax highlighting.

---

## Features

| Feature | Details |
|---|---|
| **Keyboard Shortcuts** | Ctrl/Cmd+S (Save), Ctrl/Cmd+Z (Undo), Ctrl/Cmd+Shift+Z (Redo), Ctrl/Cmd+/ (Comment Toggle), Tab (Indent), Shift+Tab (Outdent), Enter (Auto-indent) |
| **Chord Shortcut** | Ctrl+K → Ctrl+C within 2 seconds triggers "Action: Chord Success" |
| **Cross-platform** | Both `Ctrl` (Win/Linux) and `Cmd/Meta` (macOS) trigger all shortcuts |
| **Undo/Redo** | Array-based history stack with `window.getEditorState()` |
| **Event Dashboard** | Real-time log of keydown, keyup, input, compositionstart/update/end events |
| **IME Support** | Composition events tracked; shortcuts disabled during composition |
| **Debounced Highlight** | Syntax highlighting fires max once per 200ms; `window.getHighlightCallCount()` |
| **Accessibility** | `role="textbox"`, `aria-multiline="true"`, Tab trapping in editor |

---

## Setup & Running

### Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Docker (recommended for evaluation)

```bash
# Copy env file
cp .env.example .env

# Build and start
docker-compose up --build

# Or in detached mode
docker-compose up --build -d
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Health Check

The `docker-compose.yml` includes a healthcheck:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

Check health status:
```bash
docker ps   # look for (healthy) in STATUS column
```

---

## Automated Test Verification

These functions are available on `window` for automated test scripts:

```js
// Returns current content and history size
window.getEditorState()
// => { content: "hello", historySize: 3 }

// Returns number of times the syntax highlighter has fired
window.getHighlightCallCount()
// => 1
```

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── EditorPane.jsx      # Editor + all keyboard shortcuts
│   │   └── EventDashboard.jsx  # Real-time event log panel
│   ├── hooks/
│   │   └── useEditorState.js   # Undo/redo history hook
│   ├── utils/
│   │   └── debounce.js         # Generic debounce utility
│   ├── App.jsx                 # Root component
│   ├── main.jsx                # Vite entry point
│   └── index.css               # Global styles (VS Code dark theme)
├── index.html
├── vite.config.js
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Design Decisions

- **`<textarea>` over `contenteditable`**: Simpler selection/cursor management via `selectionStart`/`selectionEnd`, avoiding complex Range/Selection API work for the same feature set.
- **Array-indexed history**: Using an index pointer into a single history array instead of two stacks makes redo preservation easier and avoids stack-copying overhead.
- **Debounce at 200ms**: The 200ms debounce window on syntax highlighting comfortably exceeds the 150ms minimum requirement while being fast enough for a snappy UX.
- **`isComposingRef`**: A ref (not state) is used to track IME composition to avoid re-renders; the input handler bails out during composition, preventing premature history pushes on intermediate characters.