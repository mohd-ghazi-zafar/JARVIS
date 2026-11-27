import React from 'react';
import { Plus, Play, Pause, Check, MoreVertical, Flame, CheckCircle2, Shield } from 'lucide-react';
import type { TaskItem } from '../../types';
import { sound } from '../../utils/audio';

interface IntegratedLedgerProps {
  tasks: TaskItem[];
  activeTaskId: string | null;
  isSessionActive: boolean;
  isSessionPaused: boolean;
  onToggleTaskComplete: (id: string) => void;
  onStartFocusOnTask: (task: TaskItem) => void;
  onOpenActions: (task: TaskItem) => void;
  onOpenAddTask: () => void;
}

export const IntegratedLedger: React.FC<IntegratedLedgerProps> = ({
  tasks,
  activeTaskId,
  isSessionActive,
  isSessionPaused,
  onToggleTaskComplete,
  onStartFocusOnTask,
  onOpenActions,
  onOpenAddTask,
}) => {
  const pendingCount = tasks.filter((t) => !t.completed).length;

  const getPriorityBadge = (priority: TaskItem['priority']) => {
    switch (priority) {
      case 'deep_focus':
        return { label: 'Deep Focus', icon: <Flame size={11} />, bg: 'rgba(92, 114, 102, 0.15)', color: '#3A4D42' };
      case 'quick_win':
        return { label: 'Quick Win', icon: <CheckCircle2 size={11} />, bg: 'rgba(120, 149, 132, 0.15)', color: '#445E50' };
      case 'backburner':
        return { label: 'Backburner', icon: <Shield size={11} />, bg: 'rgba(143, 164, 152, 0.15)', color: '#52665B' };
    }
  };

  return (
    <div style={{ width: '100%', marginTop: '24px' }}>
      {/* Ledger Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          padding: '0 4px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Directives Ledger
          </h2>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {pendingCount} Active Directives • Circadian Prioritized
          </div>
        </div>

        <button
          onClick={() => {
            onOpenAddTask();
            sound.playDialClick(1400);
          }}
          className="pill-action"
          style={{ padding: '7px 12px', fontSize: '12px' }}
        >
          <Plus size={13} />
          <span>Log Directive</span>
        </button>
      </div>

      {/* Task Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.map((task) => {
          const badge = getPriorityBadge(task.priority);
          const isTaskActiveFocus = isSessionActive && activeTaskId === task.id;

          return (
            <div
              key={task.id}
              className="card-alabaster"
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: task.completed ? 0.6 : 1,
                border: isTaskActiveFocus ? '1.5px solid var(--accent-slate)' : '1px solid var(--border-subtle)',
                backgroundColor: isTaskActiveFocus ? 'rgba(244, 241, 234, 0.95)' : 'var(--card-alabaster)',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Checkbox & Directive Content */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <button
                  onClick={() => {
                    onToggleTaskComplete(task.id);
                    sound.playDialClick(task.completed ? 900 : 1500);
                  }}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '7px',
                    border: task.completed ? 'none' : '2px solid var(--accent-slate)',
                    backgroundColor: task.completed ? 'var(--accent-slate)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {task.completed && <Check size={14} color="#FFF" strokeWidth={3} />}
                </button>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: '3px',
                    }}
                  >
                    {task.title}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '1px 6px',
                        borderRadius: '5px',
                        fontSize: '9px',
                        fontWeight: 700,
                        backgroundColor: badge.bg,
                        color: badge.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                      }}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>

                    <span className="numeral" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Urgency: {task.urgencyScore}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Direct Focus Launch + Menu */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {!task.completed && (
                  <button
                    onClick={() => onStartFocusOnTask(task)}
                    className={isTaskActiveFocus ? 'btn-slate' : 'pill-action'}
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      borderRadius: '999px',
                      boxShadow: 'none',
                    }}
                  >
                    {isTaskActiveFocus ? (
                      isSessionPaused ? (
                        <>
                          <Play size={11} />
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <Pause size={11} />
                          <span>Active</span>
                        </>
                      )
                    ) : (
                      <>
                        <Play size={11} />
                        <span>Focus</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => {
                    onOpenActions(task);
                    sound.playDialClick(1200);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="Directive Actions"
                >
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
