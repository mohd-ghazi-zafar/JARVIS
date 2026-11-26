import React from 'react';
import { Check, MoreVertical, Flame, CheckCircle2, Shield } from 'lucide-react';
import type { TaskItem } from '../../types';
import { sound } from '../../utils/audio';

interface TaskCardProps {
  task: TaskItem;
  onToggleComplete: (id: string) => void;
  onOpenActions: (task: TaskItem) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onOpenActions,
}) => {
  const getPriorityBadge = () => {
    switch (task.priority) {
      case 'deep_focus':
        return { label: 'Deep Focus', icon: <Flame size={12} />, bg: 'rgba(92, 114, 102, 0.15)', color: '#3A4D42' };
      case 'quick_win':
        return { label: 'Quick Win', icon: <CheckCircle2 size={12} />, bg: 'rgba(120, 149, 132, 0.15)', color: '#445E50' };
      case 'backburner':
        return { label: 'Backburner', icon: <Shield size={12} />, bg: 'rgba(143, 164, 152, 0.15)', color: '#52665B' };
    }
  };

  const badge = getPriorityBadge();

  return (
    <div
      className="card-alabaster"
      style={{
        padding: '16px 18px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: task.completed ? 0.6 : 1,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Checkbox & Directive Content */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
        <button
          onClick={() => {
            onToggleComplete(task.id);
            sound.playDialClick(task.completed ? 900 : 1500);
          }}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '8px',
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
          {task.completed && <Check size={16} color="#FFF" strokeWidth={3} />}
        </button>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              textDecoration: task.completed ? 'line-through' : 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: '4px',
            }}
          >
            {task.title}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 700,
                backgroundColor: badge.bg,
                color: badge.color,
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
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

      {/* Action Menu Trigger */}
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
          borderRadius: '50%',
        }}
        aria-label="Directive Actions"
      >
        <MoreVertical size={18} />
      </button>
    </div>
  );
};
