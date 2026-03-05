import React, { useState, useCallback } from 'react';
import EditorPane from './components/EditorPane';
import EventDashboard from './components/EventDashboard';

let entryIdCounter = 0;

export default function App() {
    const [logEntries, setLogEntries] = useState([]);

    const handleLogEvent = useCallback((entry) => {
        setLogEntries((prev) => [
            ...prev,
            {
                ...entry,
                id: ++entryIdCounter,
                timestamp: Date.now(),
            },
        ]);
    }, []);

    const handleClear = useCallback(() => {
        setLogEntries([]);
    }, []);

    return (
        <div className="app-wrapper">
            {/* Header */}
            <header className="app-header">
                <div className="header-logo">
                    <div className="header-logo-icon">⚡</div>
                    <div>
                        <div className="header-title">CodeVault</div>
                        <div className="header-subtitle">High-Performance Code Editor</div>
                    </div>
                </div>
                <div className="header-badges">
                    <span className="badge badge-lang">JavaScript</span>
                    <span className="badge badge-status">Ready</span>
                    <span className="badge badge-lang" style={{ color: 'var(--accent-orange)', borderColor: 'rgba(251,146,60,0.3)', background: 'rgba(251,146,60,0.08)' }}>
                        {logEntries.length} events
                    </span>
                </div>
            </header>

            {/* Main body */}
            <div className="app-body">
                <EditorPane onLogEvent={handleLogEvent} />
                <EventDashboard entries={logEntries} onClear={handleClear} />
            </div>
        </div>
    );
}
