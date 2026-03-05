import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook managing editor content with undo/redo history.
 * 
 * History is stored as an array of snapshots. The `historyIndex` points to the
 * current state within the history array so that we can redo forward as well.
 */
export function useEditorState() {
    const historyRef = useRef(['']);     // all saved snapshots
    const indexRef = useRef(0);          // cursor into historyRef

    const [content, setContent] = useState('');

    /**
     * Push a new content snapshot into history (clears redo tail).
     */
    const pushHistory = useCallback((newContent) => {
        const history = historyRef.current;
        const idx = indexRef.current;

        // Truncate any redo states beyond the current index
        historyRef.current = history.slice(0, idx + 1);
        historyRef.current.push(newContent);
        indexRef.current = historyRef.current.length - 1;

        setContent(newContent);
    }, []);

    /**
     * Undo — move the index back by one and return that content, or null if at start.
     */
    const undo = useCallback(() => {
        const idx = indexRef.current;
        if (idx <= 0) return null;
        indexRef.current = idx - 1;
        const prev = historyRef.current[indexRef.current];
        setContent(prev);
        return prev;
    }, []);

    /**
     * Redo — move the index forward by one and return that content, or null if nothing to redo.
     */
    const redo = useCallback(() => {
        const idx = indexRef.current;
        if (idx >= historyRef.current.length - 1) return null;
        indexRef.current = idx + 1;
        const next = historyRef.current[indexRef.current];
        setContent(next);
        return next;
    }, []);

    /**
     * Directly overwrite the current index without adding new history (used by shortcuts that
     * modify text in-place and want the result to be treated as a single undoable action).
     */
    const replaceCurrentState = useCallback((newContent) => {
        historyRef.current[indexRef.current] = newContent;
        setContent(newContent);
    }, []);

    /**
     * Returns state snapshot for window.getEditorState().
     */
    const getState = useCallback(() => ({
        content: historyRef.current[indexRef.current],
        historySize: historyRef.current.length,
    }), []);

    return { content, setContent, pushHistory, undo, redo, replaceCurrentState, getState };
}
