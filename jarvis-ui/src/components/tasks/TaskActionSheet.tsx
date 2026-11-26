import React from 'react';
import { Play, Shield, Trash2, CheckCircle2 } from 'lucide-react';
import type { TaskItem, PriorityBand } from '../../types';
import { sound } from '../../utils/audio';

interface TaskActionSheetProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStartFocus: (task: TaskItem) => void;
  onChangePriority: (taskId: string, newPriority: PriorityBand) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
}

export const TaskActionSheet: React.FC<TaskActionSheetProps> = ({
  task,
  isOpen,
  onClose,
  onStartFocus,
  onChangePriority,
  onDeleteTask,
  onToggleComplete,
}) => {
  if (!isOpen || !task) return null;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="sheet-grabber" onClick={onClose} />

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Directive Context
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {task.title}
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* 1. Start Focus Block on this Task */}
          <button
            onClick={() => {
              onStartFocus(task);
              onClose();
              sound.playDialClick(1500);
            }}
            className="btn-slate"
            style={{ justifyContent: 'flex-start', padding: '14px 18px', width: '100%' }}
          >
            <Play size={16} />
            <span>Start {task.estimatedMinutes}m Focus Block on Directive</span>
          </button>

          {/* 2. Toggle Status */}
          <button
            onClick={() => {
              onToggleComplete(task.id);
              onClose();
              sound.playDialClick(1300);
            }}
            className="pill-action"
            style={{ padding: '14px 18px', width: '100%' }}
          >
            <CheckCircle2 size={16} color="var(--accent-slate)" />
            <span>{task.completed ? 'Mark Directive as Active' : 'Mark as Completed & Archived'}</span>
          </button>

          {/* 3. Move to Backburner */}
          {task.priority !== 'backburner' && (
            <button
              onClick={() => {
                onChangePriority(task.id, 'backburner');
                onClose();
                sound.playDialClick(1100);
              }}
              className="pill-action"
              style={{ padding: '14px 18px', width: '100%' }}
            >
              <Shield size={16} color="var(--text-muted)" />
              <span>Shift to Backburner</span>
            </button>
          )}

          {/* 4. Delete Directive */}
          <button
            onClick={() => {
              onDeleteTask(task.id);
              onClose();
              sound.playDialClick(800);
            }}
            className="pill-action"
            style={{ padding: '14px 18px', width: '100%', color: '#B23B3B' }}
          >
            <Trash2 size={16} color="#B23B3B" />
            <span>Delete Directive from Ledger</span>
          </button>
        </div>
      </div>
    </>
  );
};
