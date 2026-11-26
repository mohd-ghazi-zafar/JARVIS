import React, { useState } from 'react';
import { X, Copy, Check, Terminal } from 'lucide-react';
import type { JarvisGlobalState } from '../../types';
import { sound } from '../../utils/audio';

interface ExecutiveReportSheetProps {
  isOpen: boolean;
  state: JarvisGlobalState;
  onClose: () => void;
}

export const ExecutiveReportSheet: React.FC<ExecutiveReportSheetProps> = ({
  isOpen,
  state,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentMetric = state.metrics[state.selectedMetricDayIndex] || state.metrics[state.metrics.length - 1];
  const pendingCount = state.tasks.filter((t) => !t.completed).length;
  const completedCount = state.tasks.filter((t) => t.completed).length;
  const totalTasks = state.tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 100;

  const reportText = `[JARVIS EXECUTIVE DEBRIEF - ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}]
------------------------------------------------------------
1. CIRCADIAN ANCHOR COMPLIANCE:
   • Sleep Window: ${state.circadian.sleepTime} - ${state.circadian.wakeTime}
   • Enforcement Posture: ${state.circadian.isLocked ? 'LOCKED / ENFORCED' : 'STANDBY'}
   • Rest Duration: ${currentMetric.sleepDurationHours} Hours (Target: 7.0h)
   • Daily Adherence Score: ${currentMetric.adherenceScore}%

2. TASK LEDGER & FOCUS VELOCITY:
   • Total Directives: ${totalTasks}
   • Completed & Archived: ${completedCount}
   • Active Queue: ${pendingCount}
   • Ledger Completion Rate: ${completionRate}%
   • Deep Work Allocation: ${currentMetric.deepWorkHours} Hours

3. BEHAVIORAL STRICTNESS PROTOCOL:
   • Operational Level: Level ${state.settings.strictnessLevel} (Nominal Governance)
   • Distraction Shield Posture: ${state.settings.autoDistractionShield ? 'ACTIVE INTERCEPTION' : 'MANUAL'}
------------------------------------------------------------
Axiom: Zero conversational filler. Execution proceeding within parameters.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    sound.playDialClick(1600);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="bottom-sheet" style={{ maxHeight: '92vh' }}>
        <div className="sheet-grabber" onClick={onClose} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} color="var(--accent-slate)" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Jarvis Evening Debrief
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <div
          className="mono"
          style={{
            backgroundColor: 'rgba(28, 40, 34, 0.06)',
            padding: '16px',
            borderRadius: '16px',
            fontSize: '11px',
            lineHeight: '1.6',
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            marginBottom: '20px',
            maxHeight: '380px',
            overflowY: 'auto',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {reportText}
        </div>

        <button
          onClick={handleCopy}
          className="btn-slate"
          style={{ width: '100%', padding: '14px' }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span>{copied ? 'Debrief Copied to Clipboard' : 'Copy Executive Report'}</span>
        </button>
      </div>
    </>
  );
};
