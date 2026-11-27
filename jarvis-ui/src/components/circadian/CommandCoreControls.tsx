import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Shield, ShieldCheck, Plus, Sparkles } from 'lucide-react';
import type { CircadianSchedule } from '../../types';
import { sound } from '../../utils/audio';

interface CommandCoreControlsProps {
  schedule: CircadianSchedule;
  onToggleLock: () => void;
  selectedDuration: number;
  onSelectDuration: (mins: number) => void;
  isShieldActive: boolean;
  onToggleShield: () => void;
  onToggleWindDown: () => void;
  onSelectLeadTime: (mins: 15 | 30 | 45) => void;
  onAddGrace: () => void;
  onOpenRhythmSheet: () => void;
}

export const CommandCoreControls: React.FC<CommandCoreControlsProps> = ({
  schedule,
  onToggleLock,
  selectedDuration,
  onSelectDuration,
  isShieldActive,
  onToggleShield,
  onToggleWindDown,
  onSelectLeadTime,
  onAddGrace,
  onOpenRhythmSheet,
}) => {
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showLeadOptions, setShowLeadOptions] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!schedule.graceExpiresAt) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [schedule.graceExpiresAt]);

  const graceSecondsLeft = schedule.graceExpiresAt
    ? Math.max(0, Math.floor((schedule.graceExpiresAt - nowMs) / 1000))
    : 0;

  const graceMins = Math.floor(graceSecondsLeft / 60);
  const graceSecs = graceSecondsLeft % 60;
  const graceCountdown = `${graceMins}:${String(graceSecs).padStart(2, '0')}`;

  const durations = [25, 45, 60, 90];

  return (
    <div style={{ width: '100%', marginTop: '22px' }}>
      {/* Primary 3-Pill Execution Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.1fr 1fr',
          gap: '8px',
          alignItems: 'center',
          marginBottom: '10px',
        }}
      >
        {/* 1. Lock Schedule Button */}
        <button
          onClick={onToggleLock}
          style={{
            backgroundColor: schedule.isLocked ? 'var(--accent-slate-dark)' : 'var(--accent-slate)',
            color: 'var(--white)',
            border: 'none',
            borderRadius: '999px',
            padding: '12px 10px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-card)',
            transition: 'all 0.18s ease',
          }}
        >
          {schedule.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
          <span>{schedule.isLocked ? 'Locked' : 'Lock Bedtime'}</span>
        </button>

        {/* 2. Focus Duration Selector */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDurationPicker(!showDurationPicker)}
            style={{
              backgroundColor: 'var(--card-alabaster)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '999px',
              padding: '12px 12px',
              width: '100%',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-card)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Focus:</span>
            <span className="numeral">{selectedDuration}m Block</span>
          </button>

          {showDurationPicker && (
            <div
              style={{
                position: 'absolute',
                bottom: '110%',
                left: '0',
                right: '0',
                backgroundColor: 'var(--card-alabaster)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '6px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4px',
                boxShadow: 'var(--shadow-float)',
                zIndex: 25,
              }}
            >
              {durations.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    onSelectDuration(d);
                    setShowDurationPicker(false);
                    sound.playDialClick(1200 + d * 5);
                  }}
                  className="numeral"
                  style={{
                    padding: '8px 4px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: selectedDuration === d ? 'var(--accent-slate)' : 'transparent',
                    color: selectedDuration === d ? '#FFF' : 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {d}m
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Distraction Shield Toggle */}
        <button
          onClick={() => {
            onToggleShield();
            sound.playDialClick(isShieldActive ? 1100 : 1500);
          }}
          style={{
            backgroundColor: isShieldActive ? 'rgba(92, 114, 102, 0.2)' : 'var(--card-alabaster)',
            border: isShieldActive ? '1.5px solid var(--accent-slate)' : '1px solid var(--border-subtle)',
            borderRadius: '999px',
            padding: '12px 10px',
            fontSize: '12px',
            fontWeight: 600,
            color: isShieldActive ? 'var(--accent-slate-dark)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            boxShadow: 'var(--shadow-card)',
            cursor: 'pointer',
          }}
        >
          {isShieldActive ? <ShieldCheck size={14} color="var(--accent-slate-dark)" /> : <Shield size={14} />}
          <span>{isShieldActive ? 'Shield ON' : 'Shield Standby'}</span>
        </button>
      </div>

      {/* Secondary Micro-Controls: Wind-Down, Grace, Weekly Rhythm */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 1fr',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {/* Wind-Down Toggle Card */}
        <div
          style={{
            backgroundColor: 'var(--card-alabaster)',
            borderRadius: '999px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
          }}
        >
          <div
            onClick={() => setShowLeadOptions(!showLeadOptions)}
            style={{ cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Wind-Down</div>
            <div className="numeral" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {schedule.windDownLeadMinutes}m
            </div>
          </div>

          <div
            onClick={() => {
              onToggleWindDown();
              sound.playDialClick(1300);
            }}
            style={{
              width: '34px',
              height: '20px',
              backgroundColor: schedule.windDownEnabled ? 'var(--accent-slate)' : 'rgba(92, 114, 102, 0.25)',
              borderRadius: '999px',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
          >
            <div
              style={{
                width: '14px',
                height: '14px',
                backgroundColor: 'var(--white)',
                borderRadius: '50%',
                position: 'absolute',
                top: '3px',
                left: schedule.windDownEnabled ? '17px' : '3px',
                transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }}
            />
          </div>

          {showLeadOptions && (
            <div
              style={{
                position: 'absolute',
                bottom: '110%',
                left: '0',
                backgroundColor: 'var(--card-alabaster)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '6px',
                display: 'flex',
                gap: '4px',
                boxShadow: 'var(--shadow-float)',
                zIndex: 25,
              }}
            >
              {[15, 30, 45].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    onSelectLeadTime(mins as 15 | 30 | 45);
                    setShowLeadOptions(false);
                    sound.playDialClick(1200);
                  }}
                  className="numeral"
                  style={{
                    padding: '5px 8px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: schedule.windDownLeadMinutes === mins ? 'var(--accent-slate)' : 'transparent',
                    color: schedule.windDownLeadMinutes === mins ? '#FFF' : 'var(--text-primary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {mins}m
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grace Override */}
        <button
          onClick={onAddGrace}
          disabled={schedule.isLocked && graceSecondsLeft > 0}
          style={{
            backgroundColor: 'var(--card-alabaster)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '999px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-card)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>Grace</div>
            <div className="numeral" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {graceSecondsLeft > 0 ? graceCountdown : '+15m'}
            </div>
          </div>
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-slate)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--white)',
            }}
          >
            <Plus size={12} />
          </div>
        </button>

        {/* Weekly Rhythm Sheet Trigger */}
        <button
          onClick={onOpenRhythmSheet}
          style={{
            backgroundColor: 'var(--card-alabaster)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '999px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: 'var(--shadow-card)',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          <Sparkles size={12} color="var(--accent-slate)" />
          <span>Rhythm</span>
        </button>
      </div>
    </div>
  );
};
