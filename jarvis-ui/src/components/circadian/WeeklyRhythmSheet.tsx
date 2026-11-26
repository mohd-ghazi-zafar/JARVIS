import React from 'react';
import { ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import type { DayMetric } from '../../types';
import { sound } from '../../utils/audio';

interface WeeklyRhythmSheetProps {
  metrics: DayMetric[];
  isOpen: boolean;
  onToggle: () => void;
}

export const WeeklyRhythmSheet: React.FC<WeeklyRhythmSheetProps> = ({
  metrics,
  isOpen,
  onToggle,
}) => {
  const avgSleep = (
    metrics.reduce((acc, m) => acc + m.sleepDurationHours, 0) / metrics.length
  ).toFixed(1);
  const avgConsistency = Math.round(
    metrics.reduce((acc, m) => acc + m.adherenceScore, 0) / metrics.length
  );

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        backgroundColor: 'var(--card-alabaster)',
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px',
        boxShadow: '0 -6px 30px rgba(35, 50, 40, 0.08)',
        border: '1px solid var(--border-subtle)',
        padding: '16px 24px 28px 24px',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: isOpen ? 'translateY(0)' : 'translateY(calc(100% - 110px))',
        zIndex: 40,
      }}
    >
      {/* Grabber Handle & Header Trigger */}
      <div
        onClick={() => {
          onToggle();
          sound.playDialClick(1300);
        }}
        style={{ cursor: 'pointer', textAlign: 'center' }}
      >
        <div className="sheet-grabber" />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Weekly Rhythm
            </h3>
            <Sparkles size={14} color="var(--accent-slate)" />
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </div>
        </div>
      </div>

      {/* Rhythm Bar Chart (Exact replica of the pill bars in uploaded image) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          height: '56px',
          padding: '0 4px',
          gap: '6px',
        }}
      >
        {metrics.map((m, idx) => {
          // Height normalized relative to 7h baseline (range 20px to 50px)
          const barHeight = Math.min(50, Math.max(18, (m.sleepDurationHours / 8.0) * 48));
          const isHighAdherence = m.adherenceScore >= 90;

          return (
            <div
              key={m.day}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                gap: '6px',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: `${barHeight}px`,
                  borderRadius: '999px',
                  backgroundColor: isHighAdherence
                    ? idx === 5 || idx === 6
                      ? 'var(--accent-slate-dark)'
                      : 'var(--accent-slate)'
                    : 'rgba(92, 114, 102, 0.28)',
                  transition: 'height 0.3s ease',
                }}
              />
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                }}
              >
                {m.day[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Extended Rhythm Details when sheet is open */}
      {isOpen && (
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div
              style={{
                backgroundColor: 'rgba(92, 114, 102, 0.08)',
                padding: '14px',
                borderRadius: '16px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>AVG REST</div>
              <div className="numeral" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {avgSleep}h
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Target: 7h 0m</div>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(92, 114, 102, 0.08)',
                padding: '14px',
                borderRadius: '16px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>CONSISTENCY</div>
              <div className="numeral" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {avgConsistency}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Level 1 Nominal</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
