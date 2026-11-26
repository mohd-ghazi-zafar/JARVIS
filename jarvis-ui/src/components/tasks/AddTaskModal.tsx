import React, { useState } from 'react';
import { X, Plus, Flame, CheckCircle2, Shield } from 'lucide-react';
import type { PriorityBand } from '../../types';
import { sound } from '../../utils/audio';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (title: string, priority: PriorityBand, estimatedMins: number) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
}) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PriorityBand>('deep_focus');
  const [estimatedMins, setEstimatedMins] = useState(45);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask(title.trim(), priority, estimatedMins);
    setTitle('');
    onClose();
    sound.playDialClick(1600);
  };

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="sheet-grabber" onClick={onClose} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Log New Directive
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Directive Title
            </label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. Audit Network Gateway Tokens"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '16px',
                border: '1.5px solid var(--border-strong)',
                backgroundColor: 'var(--card-subtle)',
                fontSize: '14px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          {/* Priority Band Selection */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Urgency Band
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { setPriority('deep_focus'); setEstimatedMins(45); sound.playDialClick(1300); }}
                style={{
                  padding: '12px 6px',
                  borderRadius: '14px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: priority === 'deep_focus' ? 'var(--accent-slate)' : 'var(--card-subtle)',
                  color: priority === 'deep_focus' ? '#FFF' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Flame size={14} />
                <span>Deep Focus</span>
              </button>

              <button
                type="button"
                onClick={() => { setPriority('quick_win'); setEstimatedMins(25); sound.playDialClick(1200); }}
                style={{
                  padding: '12px 6px',
                  borderRadius: '14px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: priority === 'quick_win' ? 'var(--accent-slate)' : 'var(--card-subtle)',
                  color: priority === 'quick_win' ? '#FFF' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <CheckCircle2 size={14} />
                <span>Quick Win</span>
              </button>

              <button
                type="button"
                onClick={() => { setPriority('backburner'); setEstimatedMins(15); sound.playDialClick(1100); }}
                style={{
                  padding: '12px 6px',
                  borderRadius: '14px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: priority === 'backburner' ? 'var(--accent-slate)' : 'var(--card-subtle)',
                  color: priority === 'backburner' ? '#FFF' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Shield size={14} />
                <span>Backburner</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-slate"
            style={{ width: '100%', marginTop: '8px', padding: '14px' }}
          >
            <Plus size={16} />
            <span>Commit to Ledger</span>
          </button>
        </form>
      </div>
    </>
  );
};
