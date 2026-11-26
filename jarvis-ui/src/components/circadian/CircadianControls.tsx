import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Plus } from 'lucide-react';
import type { CircadianSchedule } from '../../types';
import { sound } from '../../utils/audio';

interface CircadianControlsProps {
  schedule: CircadianSchedule;
  onToggleLock: () => void;
  onToggleWindDown: () => void;
  onSelectLeadTime: (mins: 15 | 30 | 45) => void;
  onAddGrace: () => void;
}

export const CircadianControls: React.FC<CircadianControlsProps> = ({
  schedule,
  onToggleLock,
  onToggleWindDown,
  onSelectLeadTime,
  onAddGrace,
}) => {
  const [showLeadOptions, setShowLeadOptions] = useState(false);
  const [graceSecondsLeft, setGraceSecondsLeft] = useState(0);

  // Countdown timer for active grace period
  useEffect(() => {
    if (!schedule.graceExpiresAt) {
      setGraceSecondsLeft(0);
      return;
    }
    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((schedule.graceExpiresAt! - now) / 1000));
      setGraceSecondsLeft(diff);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [schedule.graceExpiresAt]);

  const graceMins = Math.floor(graceSecondsLeft / 60);
  const graceSecs = graceSecondsLeft % 60;
  const graceCountdown = `${graceMins}:${String(graceSecs).padStart(2, '0')}`;

  return (
    <div style={{ width: '100%', marginTop: '28px' }}>
      {/* 3 Horizontal Pill Cards matching uploaded image */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1.3fr 1fr',
          gap: '10px',
          alignItems: 'center',
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
            padding: '14px 12px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-card)',
            transition: 'all 0.18s ease',
          }}
        >
          {schedule.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
          <span>{schedule.isLocked ? 'Locked' : 'Lock Schedule'}</span>
        </button>

        {/* 2. Wind-Down Toggle Card */}
        <div
          style={{
            backgroundColor: 'var(--card-alabaster)',
            borderRadius: '999px',
            padding: '8px 14px',
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
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Wind-Down</div>
            <div className="numeral" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {schedule.windDownLeadMinutes}m
            </div>
          </div>

          {/* Toggle Switch */}
          <div
            onClick={() => {
              onToggleWindDown();
              sound.playDialClick(1300);
            }}
            style={{
              width: '40px',
              height: '24px',
              backgroundColor: schedule.windDownEnabled ? 'var(--accent-slate)' : 'rgba(92, 114, 102, 0.25)',
              borderRadius: '999px',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                backgroundColor: 'var(--white)',
                borderRadius: '50%',
                position: 'absolute',
                top: '3px',
                left: schedule.windDownEnabled ? '19px' : '3px',
                transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              }}
            />
          </div>

          {/* Popover Lead Time Selector */}
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
                zIndex: 20,
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
                    padding: '6px 10px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: schedule.windDownLeadMinutes === mins ? 'var(--accent-slate)' : 'transparent',
                    color: schedule.windDownLeadMinutes === mins ? '#FFF' : 'var(--text-primary)',
                    fontSize: '12px',
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

        {/* 3. Grace +15m Card */}
        <button
          onClick={onAddGrace}
          disabled={schedule.isLocked && graceSecondsLeft > 0}
          style={{
            backgroundColor: 'var(--card-alabaster)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '999px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-card)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Grace</div>
            <div className="numeral" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {graceSecondsLeft > 0 ? graceCountdown : '+15m'}
            </div>
          </div>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-slate)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--white)',
            }}
          >
            <Plus size={14} />
          </div>
        </button>
      </div>
    </div>
  );
};
