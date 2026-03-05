import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorState } from '../hooks/useEditorState';
import { debounce } from '../utils/debounce';

// ─── Syntax highlight call counter (global, for window.getHighlightCallCount) ──
let highlightCallCount = 0;

// ─── Debounced "syntax highlighter" (simulated, 200ms) ────────────────────────
const debouncedHighlight = debounce(() => {
    highlightCallCount++;
}, 200);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the index of the start of the line where `pos` falls. */
function getLineStart(text, pos) {
    const before = text.lastIndexOf('\n', pos - 1);
    return before === -1 ? 0 : before + 1;
}

/** Returns the leading whitespace of the line that contains `pos`. */
function getLineIndent(text, pos) {
    const lineStart = getLineStart(text, pos);
    const match = text.slice(lineStart).match(/^(\s*)/);
    return match ? match[1] : '';
}

/**
 * Insert `insertion` at `insertPos` in `text`.
 * Returns { newText, newCursor }.
 */
function insertAt(text, insertPos, insertion) {
    const newText = text.slice(0, insertPos) + insertion + text.slice(insertPos);
    return { newText, newCursor: insertPos + insertion.length };
}

/**
 * Remove `count` characters at `startPos` from `text`.
 * Returns { newText, newCursor }.
 */
function removeAt(text, startPos, count) {
    const newText = text.slice(0, startPos) + text.slice(startPos + count);
    return { newText, newCursor: startPos };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * EditorPane — the main code editor area.
 *
 * Props:
 *   onLogEvent(entry) — called to push an item to the event dashboard
 */
export default function EditorPane({ onLogEvent }) {
    const textareaRef = useRef(null);
    const { content, pushHistory, undo, redo, getState } = useEditorState();
    const isComposingRef = useRef(false);  // true while an IME composition is active

    // Chord shortcut state: set to true when Ctrl/Cmd+K has been pressed
    const chordActiveRef = useRef(false);
    const chordTimerRef = useRef(null);

    // UI state
    const [lineCount, setLineCount] = useState(1);
    const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
    const [chordIndicator, setChordIndicator] = useState(false);
    const [saveFlash, setSaveFlash] = useState(false);

    // ── Expose globals ─────────────────────────────────────────────────────────
    useEffect(() => {
        window.getEditorState = () => getState();
        window.getHighlightCallCount = () => highlightCallCount;

        return () => {
            delete window.getEditorState;
            delete window.getHighlightCallCount;
        };
    }, [getState]);

    // ── Update line numbers when content changes ────────────────────────────────
    useEffect(() => {
        const lines = (content.match(/\n/g) || []).length + 1;
        setLineCount(lines);
    }, [content]);

    // ── Internal helper: set textarea value + sync React state ─────────────────
    const setEditorValue = useCallback((newValue, newCursor) => {
        const el = textareaRef.current;
        if (!el) return;
        el.value = newValue;
        if (newCursor !== undefined) {
            el.selectionStart = newCursor;
            el.selectionEnd = newCursor;
        }
    }, []);

    // ── Log helper ─────────────────────────────────────────────────────────────
    const log = useCallback((entry) => {
        onLogEvent(entry);
    }, [onLogEvent]);

    // ── Reset chord state ──────────────────────────────────────────────────────
    const resetChord = useCallback(() => {
        chordActiveRef.current = false;
        clearTimeout(chordTimerRef.current);
        setChordIndicator(false);
    }, []);

    // ── Trigger save ───────────────────────────────────────────────────────────
    const triggerSave = useCallback(() => {
        setSaveFlash(true);
        setTimeout(() => setSaveFlash(false), 1800);
        log({ type: 'action', key: 'S', description: 'Action: Save', modifiers: 'Ctrl/Cmd' });
    }, [log]);

    // ── keydown handler ────────────────────────────────────────────────────────
    const handleKeyDown = useCallback((e) => {
        const el = textareaRef.current;
        const isMac = navigator.platform.toUpperCase().includes('MAC');
        const isModifier = isMac ? e.metaKey : e.ctrlKey;
        // Cross-platform: handle BOTH Ctrl and Meta for all shortcuts
        const isCtrlOrMeta = e.ctrlKey || e.metaKey;

        // Build log entry
        const modParts = [];
        if (e.ctrlKey) modParts.push('Ctrl');
        if (e.metaKey) modParts.push('Meta');
        if (e.altKey) modParts.push('Alt');
        if (e.shiftKey) modParts.push('Shift');
        const modStr = modParts.join('+');

        log({
            type: 'keydown',
            key: e.key,
            code: e.code,
            modifiers: modStr,
        });

        const text = el.value;
        const selStart = el.selectionStart;
        const selEnd = el.selectionEnd;

        // ── Ctrl/Cmd + S — Save ────────────────────────────────────────────────
        if (isCtrlOrMeta && e.key === 's') {
            e.preventDefault();
            triggerSave();
            resetChord();
            return;
        }

        // ── Ctrl/Cmd + Z — Undo ────────────────────────────────────────────────
        if (isCtrlOrMeta && !e.shiftKey && e.key === 'z') {
            e.preventDefault();
            const prev = undo();
            if (prev !== null) {
                setEditorValue(prev, prev.length);
            }
            resetChord();
            return;
        }

        // ── Ctrl/Cmd + Shift + Z — Redo ────────────────────────────────────────
        if (isCtrlOrMeta && e.shiftKey && e.key === 'z') {
            e.preventDefault();
            const next = redo();
            if (next !== null) {
                setEditorValue(next, next.length);
            }
            resetChord();
            return;
        }

        // ── Ctrl/Cmd + / — Toggle line comment ─────────────────────────────────
        if (isCtrlOrMeta && e.key === '/') {
            e.preventDefault();
            const lineStart = getLineStart(text, selStart);
            const lineContent = text.slice(lineStart);
            // Check if the line already starts with '// '
            if (lineContent.startsWith('// ')) {
                // Remove the comment prefix
                const { newText, newCursor } = removeAt(text, lineStart, 3);
                setEditorValue(newText, Math.max(lineStart, newCursor + selStart - lineStart - 3));
                pushHistory(newText);
            } else {
                // Add the comment prefix
                const { newText } = insertAt(text, lineStart, '// ');
                setEditorValue(newText, selStart + 3);
                pushHistory(newText);
            }
            resetChord();
            return;
        }

        // ── Chord: Ctrl/Cmd + K ────────────────────────────────────────────────
        if (isCtrlOrMeta && e.key === 'k') {
            e.preventDefault();
            // Start the chord sequence
            chordActiveRef.current = true;
            setChordIndicator(true);
            clearTimeout(chordTimerRef.current);
            chordTimerRef.current = setTimeout(() => {
                resetChord();
            }, 2000);
            return;
        }

        // ── Chord: Ctrl/Cmd + C (second step) ─────────────────────────────────
        if (isCtrlOrMeta && e.key === 'c' && chordActiveRef.current) {
            e.preventDefault();
            resetChord();
            log({ type: 'action', key: 'C', description: 'Action: Chord Success', modifiers: 'Ctrl/Cmd' });
            return;
        }

        // ── Tab — indent ───────────────────────────────────────────────────────
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            const lineStart = getLineStart(text, selStart);
            const { newText, newCursor } = insertAt(text, lineStart, '  ');
            setEditorValue(newText, selStart + 2);
            pushHistory(newText);
            resetChord();
            return;
        }

        // ── Shift+Tab — outdent ────────────────────────────────────────────────
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            const lineStart = getLineStart(text, selStart);
            const lineContent = text.slice(lineStart);
            if (lineContent.startsWith('  ')) {
                const { newText } = removeAt(text, lineStart, 2);
                setEditorValue(newText, Math.max(lineStart, selStart - 2));
                pushHistory(newText);
            }
            resetChord();
            return;
        }

        // ── Enter — auto-indent ────────────────────────────────────────────────
        if (e.key === 'Enter') {
            e.preventDefault();
            const indent = getLineIndent(text, selStart);
            const insertion = '\n' + indent;
            const newText = text.slice(0, selStart) + insertion + text.slice(selEnd);
            const newCursor = selStart + insertion.length;
            setEditorValue(newText, newCursor);
            pushHistory(newText);
            resetChord();
            return;
        }

        // For any other key that is not a modifier itself, reset chord
        if (!['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
            resetChord();
        }
    }, [log, undo, redo, setEditorValue, pushHistory, triggerSave, resetChord]);

    // ── keyup handler ──────────────────────────────────────────────────────────
    const handleKeyUp = useCallback((e) => {
        const modParts = [];
        if (e.ctrlKey) modParts.push('Ctrl');
        if (e.metaKey) modParts.push('Meta');
        if (e.altKey) modParts.push('Alt');
        if (e.shiftKey) modParts.push('Shift');

        log({
            type: 'keyup',
            key: e.key,
            code: e.code,
            modifiers: modParts.join('+'),
        });
    }, [log]);

    // ── input handler ──────────────────────────────────────────────────────────
    const handleInput = useCallback((e) => {
        // Skip logging during IME composition
        if (isComposingRef.current) return;

        const newValue = e.target.value;
        pushHistory(newValue);

        // Update cursor position info
        const el = textareaRef.current;
        if (el) {
            const before = newValue.slice(0, el.selectionStart);
            const lines = before.split('\n');
            setCursorPos({ line: lines.length, col: lines[lines.length - 1].length + 1 });
        }

        log({ type: 'input', key: e.inputType || 'text', code: '', modifiers: '' });

        // Trigger debounced syntax highlighting
        debouncedHighlight();
    }, [pushHistory, log]);

    // ── composition handlers ───────────────────────────────────────────────────
    const handleCompositionStart = useCallback((e) => {
        isComposingRef.current = true;
        log({ type: 'compositionstart', key: e.data || '', code: '', modifiers: '' });
    }, [log]);

    const handleCompositionUpdate = useCallback((e) => {
        log({ type: 'compositionupdate', key: e.data || '', code: '', modifiers: '' });
    }, [log]);

    const handleCompositionEnd = useCallback((e) => {
        isComposingRef.current = false;
        const newValue = textareaRef.current?.value || '';
        pushHistory(newValue);
        log({ type: 'compositionend', key: e.data || '', code: '', modifiers: '' });
        debouncedHighlight();
    }, [log, pushHistory]);

    // ── cursor update on click/key ─────────────────────────────────────────────
    const updateCursor = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        const before = el.value.slice(0, el.selectionStart);
        const lines = before.split('\n');
        setCursorPos({ line: lines.length, col: lines[lines.length - 1].length + 1 });
    }, []);

    // ─── Line numbers array ────────────────────────────────────────────────────
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

    return (
        <>
            <div className="editor-pane">
                {/* Tab bar */}
                <div className="editor-tab-bar">
                    <div className="editor-tab active">
                        <span className="editor-tab-dot" style={{ background: '#5e9eff' }}></span>
                        main.js
                    </div>
                    <div className="editor-tab">
                        <span className="editor-tab-dot" style={{ background: '#4ade80' }}></span>
                        index.html
                    </div>
                    <div className="editor-tab">
                        <span className="editor-tab-dot" style={{ background: '#fbbf24' }}></span>
                        styles.css
                    </div>
                </div>

                {/* Editor area */}
                <div className="editor-content-area">
                    {/* Line numbers */}
                    <div className="line-numbers" aria-hidden="true">
                        {lineNumbers.map((n) => (
                            <div
                                key={`ln-${n}`}
                                className={`line-number${n === cursorPos.line ? ' active' : ''}`}
                            >
                                {n}
                            </div>
                        ))}
                    </div>

                    {/* Editor input */}
                    <div
                        className="editor-container-wrap"
                        data-test-id="editor-container"
                    >
                        <textarea
                            ref={textareaRef}
                            data-test-id="editor-input"
                            className="editor-input"
                            spellCheck={false}
                            autoCorrect="off"
                            autoCapitalize="off"
                            autoComplete="off"
                            role="textbox"
                            aria-multiline="true"
                            aria-label="Code editor"
                            placeholder="// Start typing your code here..."
                            onKeyDown={handleKeyDown}
                            onKeyUp={handleKeyUp}
                            onInput={handleInput}
                            onCompositionStart={handleCompositionStart}
                            onCompositionUpdate={handleCompositionUpdate}
                            onCompositionEnd={handleCompositionEnd}
                            onClick={updateCursor}
                            onKeyUpCapture={updateCursor}
                        />
                    </div>
                </div>

                {/* Status bar */}
                <div className="editor-statusbar">
                    <div className="statusbar-left">
                        <span>⎇ main</span>
                        <span>JS</span>
                        <span>UTF-8</span>
                    </div>
                    <div className="statusbar-right">
                        <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
                        <span>Spaces: 2</span>
                        <span>{content.length} chars</span>
                    </div>
                </div>
            </div>

            {/* Chord indicator */}
            {chordIndicator && (
                <div className="chord-indicator">
                    Ctrl+K → waiting for Ctrl+C…
                </div>
            )}

            {/* Save flash */}
            {saveFlash && (
                <div className="save-flash">
                    ✓ File saved
                </div>
            )}
        </>
    );
}
