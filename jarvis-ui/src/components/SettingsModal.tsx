import React from 'react';
import { X, Volume2, VolumeX, Shield, RotateCcw } from 'lucide-react';
import type { JarvisSettings } from '../types';
import { sound } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  settings: JarvisSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<JarvisSettings>) => void;
  onResetDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
  onResetDefaults,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="bottom-sheet" style={{ maxHeight: '90vh' }}>
        <div className="sheet-grabber" onClick={onClose} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Schedule & System Rules
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Strictness Level Selector */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Operational Strictness Level
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  onUpdateSettings({ strictnessLevel: lvl as 1 | 2 | 3 });
                  sound.playDialClick(1100 + lvl * 100);
                }}
                style={{
                  padding: '12px 8px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: settings.strictnessLevel === lvl ? 'var(--accent-slate)' : 'var(--card-subtle)',
                  color: settings.strictnessLevel === lvl ? '#FFF' : 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div>Level {lvl}</div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                  {lvl === 1 ? 'Nominal' : lvl === 2 ? 'Heightened' : 'Lockdown'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tactile Audio Toggle */}
        <div
          onClick={() => {
            const next = !settings.soundEnabled;
            onUpdateSettings({ soundEnabled: next });
            sound.setSoundEnabled(next);
            if (next) sound.playDialClick(1400);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            backgroundColor: 'var(--card-subtle)',
            borderRadius: '16px',
            marginBottom: '12px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {settings.soundEnabled ? <Volume2 size={18} color="var(--accent-slate)" /> : <VolumeX size={18} color="var(--text-muted)" />}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Tactile Audio Clicks</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Haptic dial audio synthesizer</div>
            </div>
          </div>
          <div className="numeral" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-slate)' }}>
            {settings.soundEnabled ? 'ON' : 'OFF'}
          </div>
        </div>

        {/* Distraction Shield Auto-Enforce */}
        <div
          onClick={() => {
            onUpdateSettings({ autoDistractionShield: !settings.autoDistractionShield });
            sound.playDialClick(1300);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            backgroundColor: 'var(--card-subtle)',
            borderRadius: '16px',
            marginBottom: '24px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={18} color="var(--accent-slate)" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Auto-Shield During Focus</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Restricts entertainment vectors automatically</div>
            </div>
          </div>
          <div className="numeral" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-slate)' }}>
            {settings.autoDistractionShield ? 'ENABLED' : 'DISABLED'}
          </div>
        </div>

        {/* Reset to Blueprint Defaults */}
        <button
          onClick={() => {
            if (confirm('Reset all schedules, tasks, and settings to Jarvis Blueprint defaults?')) {
              onResetDefaults();
              onClose();
              sound.playLockChime(false);
            }
          }}
          className="btn-slate-outline"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            color: '#B23B3B',
            borderColor: 'rgba(178, 59, 59, 0.4)',
          }}
        >
          <RotateCcw size={15} />
          <span>Reset to Blueprint Defaults</span>
        </button>
      </div>
    </>
  );
};
