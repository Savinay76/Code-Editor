import React, { useRef, useEffect, useState } from 'react';

// ─── Event type config ─────────────────────────────────────────────────────

const EVENT_TYPE_CLASS = {
    keydown: 'type-keydown',
    keyup: 'type-keyup',
    input: 'type-input',
    compositionstart: 'type-composition',
    compositionupdate: 'type-composition',
    compositionend: 'type-composition',
    action: 'type-action',
};

const FILTER_TYPES = ['all', 'keydown', 'keyup', 'input', 'composition', 'action'];

function formatTime(d) {
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        '.' + String(d.getMilliseconds()).padStart(3, '0');
}

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * EventDashboard — displays real-time keyboard/input event logs.
 *
 * Props:
 *   entries: Array<{ id, type, key, code, modifiers, description, timestamp }>
 *   onClear: () => void
 */
export default function EventDashboard({ entries, onClear }) {
    const listRef = useRef(null);
    const [filter, setFilter] = useState('all');

    // Auto-scroll to the bottom when new entries arrive
    useEffect(() => {
        const el = listRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, [entries]);

    const filteredEntries = entries.filter((e) => {
        if (filter === 'all') return true;
        if (filter === 'composition') return e.type.startsWith('composition');
        return e.type === filter;
    });

    return (
        <div className="dashboard-pane">
            {/* Header */}
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <div className="dashboard-icon">📡</div>
                    Event Dashboard
                </div>
                <button className="dashboard-clear-btn" onClick={onClear} title="Clear log">
                    Clear
                </button>
            </div>

            {/* Filter chips */}
            <div className="dashboard-filters">
                {FILTER_TYPES.map((f) => (
                    <button
                        key={f}
                        className={`filter-chip${filter === f ? ' active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Log panel */}
            <div data-test-id="event-dashboard">
                <ul
                    data-test-id="event-log-list"
                    ref={listRef}
                >
                    {filteredEntries.length === 0 ? (
                        <div className="dashboard-empty">
                            <div className="dashboard-empty-icon">⌨️</div>
                            <div className="dashboard-empty-text">
                                Start typing in the editor<br />to see events here
                            </div>
                        </div>
                    ) : (
                        filteredEntries.map((entry) => {
                            const typeClass = EVENT_TYPE_CLASS[entry.type] || 'type-action';
                            return (
                                <li
                                    key={entry.id}
                                    data-test-id="event-log-entry"
                                >
                                    {/* Type badge */}
                                    <span className={`log-entry-type-badge ${typeClass}`}>
                                        {entry.type}
                                    </span>

                                    {/* Details */}
                                    <div className="log-entry-details">
                                        <div className="log-entry-main">
                                            {entry.description
                                                ? entry.description
                                                : `key: "${entry.key}"`}
                                        </div>
                                        <div className="log-entry-meta">
                                            {entry.code && (
                                                <span className="log-meta-tag">{entry.code}</span>
                                            )}
                                            {entry.modifiers && (
                                                <span className="log-meta-tag">{entry.modifiers}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Timestamp */}
                                    <div className="log-entry-time">
                                        {formatTime(new Date(entry.timestamp))}
                                    </div>
                                </li>
                            );
                        })
                    )}
                </ul>
            </div>

            {/* Shortcuts reference */}
            <div className="shortcuts-panel">
                <div className="shortcuts-title">Shortcuts</div>
                <div className="shortcuts-grid">
                    <div className="shortcut-item">
                        <span className="kbd"><span className="kbd-key">Ctrl</span><span className="kbd-key">S</span></span>
                        <span className="shortcut-desc">Save</span>
                    </div>
                    <div className="shortcut-item">
                        <span className="kbd"><span className="kbd-key">Ctrl</span><span className="kbd-key">Z</span></span>
                        <span className="shortcut-desc">Undo</span>
                    </div>
                    <div className="shortcut-item">
                        <span className="kbd"><span className="kbd-key">Ctrl</span><span className="kbd-key">⇧</span><span className="kbd-key">Z</span></span>
                        <span className="shortcut-desc">Redo</span>
                    </div>
                    <div className="shortcut-item">
                        <span className="kbd"><span className="kbd-key">Ctrl</span><span className="kbd-key">/</span></span>
                        <span className="shortcut-desc">Comment</span>
                    </div>
                    <div className="shortcut-item">
                        <span className="kbd"><span className="kbd-key">Tab</span></span>
                        <span className="shortcut-desc">Indent</span>
                    </div>
                    <div className="shortcut-item">
                        <span className="kbd"><span className="kbd-key">⇧</span><span className="kbd-key">Tab</span></span>
                        <span className="shortcut-desc">Outdent</span>
                    </div>
                    <div className="shortcut-item">
                        <span className="kbd"><span className="kbd-key">Ctrl</span><span className="kbd-key">K</span><span className="kbd-key">C</span></span>
                        <span className="shortcut-desc">Chord</span>
                    </div>
                    <div className="shortcut-item">
                        <span className="kbd"><span className="kbd-key">↵</span></span>
                        <span className="shortcut-desc">Auto-indent</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
