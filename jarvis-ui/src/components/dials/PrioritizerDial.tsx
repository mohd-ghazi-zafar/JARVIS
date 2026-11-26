import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw, Flame, CheckCircle2, Shield } from 'lucide-react';
import type { PriorityBand, FocusSession } from '../../types';
import { getAngleFromCenter, getCoordinatesOnCircle } from '../../utils/time';
import { sound } from '../../utils/audio';

interface PrioritizerDialProps {
  session: FocusSession;
  onDurationChange: (minutes: number) => void;
  onBandChange: (band: PriorityBand) => void;
  onTogglePlay: () => void;
  onResetTimer: () => void;
}

const DURATIONS = [15, 25, 45, 60, 90];

export const PrioritizerDial: React.FC<PrioritizerDialProps> = ({
  session,
  onDurationChange,
  onBandChange,
  onTogglePlay,
  onResetTimer,
}) => {
  const dialRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const size = 300;
  const center = size / 2;
  const radius = 105;

  // Map 15-90 minutes across 0 to 300 degrees
  const minDur = 15;
  const maxDur = 90;
  const currentAngle = ((session.durationMinutes - minDur) / (maxDur - minDur)) * 280 + 40;
  const knobPos = getCoordinatesOnCircle(center, center, radius, currentAngle);

  // Remaining percentage for session progress ring
  const totalSeconds = session.durationMinutes * 60;
  const elapsedRatio = Math.max(0, Math.min(1, 1 - session.remainingSeconds / totalSeconds));
  const progressSweep = elapsedRatio * 280;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (session.active) return;
    e.preventDefault();
    setIsDragging(true);
    sound.playDialClick(1300);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging || !dialRef.current || session.active) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const angle = getAngleFromCenter(cx, cy, e.clientX, e.clientY);
    // Clamp angle between 40 and 320 degrees
    const clampedAngle = Math.max(40, Math.min(320, angle));
    const ratio = (clampedAngle - 40) / 280;
    const rawMinutes = minDur + ratio * (maxDur - minDur);

    // Snap to nearest standard duration
    const closest = DURATIONS.reduce((prev, curr) =>
      Math.abs(curr - rawMinutes) < Math.abs(prev - rawMinutes) ? curr : prev
    );

    if (closest !== session.durationMinutes) {
      onDurationChange(closest);
      sound.playDialClick(1000 + closest * 8);
    }
  }, [isDragging, onDurationChange, session.active, session.durationMinutes]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Format MM:SS
  const minsRemaining = Math.floor(session.remainingSeconds / 60);
  const secsRemaining = session.remainingSeconds % 60;
  const formattedTime = `${String(minsRemaining).padStart(2, '0')}:${String(secsRemaining).padStart(2, '0')}`;

  const getBandColor = () => {
    switch (session.band) {
      case 'deep_focus': return '#5C7266';
      case 'quick_win': return '#789584';
      case 'backburner': return '#8FA498';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {/* Priority Band Selector Pills */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          backgroundColor: 'var(--card-alabaster)',
          padding: '4px',
          borderRadius: '999px',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <button
          onClick={() => { onBandChange('deep_focus'); sound.playDialClick(1400); }}
          className="pill-action"
          style={{
            border: 'none',
            padding: '7px 14px',
            fontSize: '12px',
            backgroundColor: session.band === 'deep_focus' ? 'var(--accent-slate)' : 'transparent',
            color: session.band === 'deep_focus' ? '#FFF' : 'var(--text-secondary)',
          }}
        >
          <Flame size={13} />
          <span>Deep Focus</span>
        </button>
        <button
          onClick={() => { onBandChange('quick_win'); sound.playDialClick(1200); }}
          className="pill-action"
          style={{
            border: 'none',
            padding: '7px 14px',
            fontSize: '12px',
            backgroundColor: session.band === 'quick_win' ? 'var(--accent-slate)' : 'transparent',
            color: session.band === 'quick_win' ? '#FFF' : 'var(--text-secondary)',
          }}
        >
          <CheckCircle2 size={13} />
          <span>Quick Win</span>
        </button>
        <button
          onClick={() => { onBandChange('backburner'); sound.playDialClick(1000); }}
          className="pill-action"
          style={{
            border: 'none',
            padding: '7px 14px',
            fontSize: '12px',
            backgroundColor: session.band === 'backburner' ? 'var(--accent-slate)' : 'transparent',
            color: session.band === 'backburner' ? '#FFF' : 'var(--text-secondary)',
          }}
        >
          <Shield size={13} />
          <span>Backburner</span>
        </button>
      </div>

      <svg
        ref={dialRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="dial-touch-zone"
      >
        <defs>
          <radialGradient id="focusCenterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#CAD6CD" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={center} cy={center} r={radius} fill="url(#focusCenterGlow)" />

        {/* Background Track Arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="14"
          strokeDasharray="520 80"
          strokeDashoffset="120"
          strokeLinecap="round"
        />

        {/* Active Session Progress Arc */}
        {session.active && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={getBandColor()}
            strokeWidth="15"
            strokeDasharray={`${(progressSweep / 360) * 660} 700`}
            strokeDashoffset="120"
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.3s ease' }}
          />
        )}

        {/* Preset Duration Notch Dots */}
        {DURATIONS.map((dur) => {
          const angle = ((dur - minDur) / (maxDur - minDur)) * 280 + 40;
          const pos = getCoordinatesOnCircle(center, center, radius, angle);
          const isSelected = session.durationMinutes === dur;
          return (
            <g key={dur}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isSelected ? 4 : 2.5}
                fill={isSelected ? 'var(--accent-slate)' : 'rgba(92, 114, 102, 0.4)'}
              />
              <text
                x={pos.x + (angle > 180 ? -16 : 16)}
                y={pos.y + 4}
                textAnchor="middle"
                fontSize="10"
                fontWeight={isSelected ? 700 : 500}
                fill="var(--text-secondary)"
                className="numeral"
              >
                {dur}m
              </text>
            </g>
          );
        })}

        {/* Dial Handle Knob */}
        <g
          transform={`translate(${knobPos.x}, ${knobPos.y})`}
          onPointerDown={handlePointerDown}
          style={{ cursor: session.active ? 'not-allowed' : 'grab' }}
        >
          <circle
            r="16"
            fill="#F4F1EA"
            stroke="rgba(92, 114, 102, 0.25)"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0 4px 10px rgba(35, 50, 40, 0.2))' }}
          />
          <circle r="5" fill="var(--accent-slate)" />
        </g>
      </svg>

      {/* Center Readout & Controls */}
      <div
        style={{
          position: 'absolute',
          top: '55%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          width: 190,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-1px',
            marginBottom: '4px',
          }}
        >
          {session.active ? formattedTime : `${session.durationMinutes}:00`}
        </div>

        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--text-secondary)',
            marginBottom: '12px',
          }}
        >
          {session.band.replace('_', ' ')}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <button
            onClick={onTogglePlay}
            className="btn-slate"
            style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '999px' }}
          >
            {session.active && !session.paused ? <Pause size={14} /> : <Play size={14} />}
            <span>{session.active ? (session.paused ? 'Resume' : 'Pause') : `Start ${session.durationMinutes}m`}</span>
          </button>
          {session.active && (
            <button
              onClick={onResetTimer}
              className="pill-action"
              style={{ padding: '8px', borderRadius: '999px' }}
              title="Reset Session"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
