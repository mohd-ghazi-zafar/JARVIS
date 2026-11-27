import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Moon, Sun, Play, Pause, RotateCcw, AlertTriangle } from 'lucide-react';
import type { FocusSession, TaskItem } from '../../types';
import {
  formatTime12,
  calculateDurationHoursMinutes,
  minutesToAngle,
  angleToMinutes,
  getAngleFromCenter,
  getCoordinatesOnCircle,
  minutesToTime,
  timeToMinutes,
} from '../../utils/time';
import { sound } from '../../utils/audio';

interface MasterDialProps {
  sleepTime: string;
  wakeTime: string;
  isLocked: boolean;
  onTimeChange: (sleep: string, wake: string) => void;
  focusSession: FocusSession;
  activeTask: TaskItem | null;
  onToggleFocus: () => void;
  onResetFocus: () => void;
  windDownLeadMinutes: number;
}

export const MasterCircadianTaskDial: React.FC<MasterDialProps> = ({
  sleepTime,
  wakeTime,
  isLocked,
  onTimeChange,
  focusSession,
  activeTask,
  onToggleFocus,
  onResetFocus,
  windDownLeadMinutes,
}) => {
  const dialRef = useRef<SVGSVGElement | null>(null);
  const [activeThumb, setActiveThumb] = useState<'sleep' | 'wake' | null>(null);
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  // Keep live current time updated every 30 seconds
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTimeMinutes(d.getHours() * 60 + d.getMinutes());
    };
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const size = 330;
  const center = size / 2;
  const radius = 118;

  const sleepMinutes = timeToMinutes(sleepTime);
  const wakeMinutes = timeToMinutes(wakeTime);

  const sleepAngle = minutesToAngle(sleepMinutes);
  const wakeAngle = minutesToAngle(wakeMinutes);
  const nowAngle = minutesToAngle(currentTimeMinutes);

  const duration = calculateDurationHoursMinutes(sleepTime, wakeTime);

  // Knob Coordinates
  const sleepPos = getCoordinatesOnCircle(center, center, radius, sleepAngle);
  const wakePos = getCoordinatesOnCircle(center, center, radius, wakeAngle);
  const nowPos = getCoordinatesOnCircle(center, center, radius, nowAngle);

  // Calculate SVG Sleep Arc (White Glowing)
  const calculateSleepArc = () => {
    let sweep = (wakeAngle - sleepAngle + 360) % 360;
    if (sweep === 0) sweep = 360;
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${sleepPos.x} ${sleepPos.y} A ${radius} ${radius} 0 ${largeArc} 1 ${wakePos.x} ${wakePos.y}`;
  };

  // Focus Arc calculation:
  // When active: arc represents the active/remaining duration from Now
  // When idle: projects selected duration from Now
  const activeRemainingMins = focusSession.active
    ? Math.max(1, Math.ceil(focusSession.remainingSeconds / 60))
    : focusSession.durationMinutes;

  const focusEndMinutes = (currentTimeMinutes + activeRemainingMins) % 1440;
  const focusEndAngle = minutesToAngle(focusEndMinutes);

  const calculateFocusArc = () => {
    const sweep = (focusEndAngle - nowAngle + 360) % 360;
    const largeArc = sweep > 180 ? 1 : 0;
    const endPos = getCoordinatesOnCircle(center, center, radius, focusEndAngle);
    return `M ${nowPos.x} ${nowPos.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPos.x} ${endPos.y}`;
  };

  // Bedtime Collision Guard Detection (Pure & Midnight-Safe)
  // Distance to bedtime in minutes handling day-boundary wrap
  const minutesUntilBedtime = (sleepMinutes - currentTimeMinutes + 1440) % 1440;
  const minutesUntilWindDown = Math.max(0, minutesUntilBedtime - windDownLeadMinutes);

  // Detect collision if approaching bedtime within 12 hours
  const isApproachingBedtime = minutesUntilBedtime <= 720;
  const isBreachingBedtime = isApproachingBedtime && activeRemainingMins > minutesUntilBedtime;
  const isEncroachingWindDown =
    isApproachingBedtime && !isBreachingBedtime && activeRemainingMins > minutesUntilWindDown;

  // Pointer drag handling for sleep/wake handles
  const handlePointerDown = (thumb: 'sleep' | 'wake', e: React.PointerEvent) => {
    if (isLocked) return;
    e.preventDefault();
    setActiveThumb(thumb);
    sound.playDialClick(1400);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!activeThumb || !dialRef.current || isLocked) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const angle = getAngleFromCenter(cx, cy, e.clientX, e.clientY);
    const snappedMins = angleToMinutes(angle, 15);
    const newTime = minutesToTime(snappedMins);

    if (activeThumb === 'sleep' && newTime !== sleepTime) {
      if (newTime === wakeTime) return;
      onTimeChange(newTime, wakeTime);
      sound.playDialClick(1100);
    } else if (activeThumb === 'wake' && newTime !== wakeTime) {
      if (newTime === sleepTime) return;
      onTimeChange(sleepTime, newTime);
      sound.playDialClick(1500);
    }
  }, [activeThumb, isLocked, onTimeChange, sleepTime, wakeTime]);

  const handlePointerUp = useCallback(() => {
    if (activeThumb) {
      setActiveThumb(null);
    }
  }, [activeThumb]);

  useEffect(() => {
    if (activeThumb) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [activeThumb, handlePointerMove, handlePointerUp]);

  // Render 24-hour procedural radial tick marks
  const renderTicks = () => {
    const ticks = [];
    const totalTicks = 96;
    for (let i = 0; i < totalTicks; i++) {
      const angle = (i / totalTicks) * 360;
      const isMajorHour = i % 4 === 0;
      const isQuarterTick = i % 24 === 0;
      const tickLength = isQuarterTick ? 10 : isMajorHour ? 7 : 4;
      const tickRadius = 152;

      const p1 = getCoordinatesOnCircle(center, center, tickRadius - tickLength, angle);
      const p2 = getCoordinatesOnCircle(center, center, tickRadius, angle);

      ticks.push(
        <line
          key={`tick-${i}`}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={isQuarterTick ? 'rgba(75, 95, 85, 0.75)' : isMajorHour ? 'rgba(92, 114, 102, 0.45)' : 'rgba(92, 114, 102, 0.22)'}
          strokeWidth={isQuarterTick ? 2 : isMajorHour ? 1.5 : 1}
          strokeLinecap="round"
        />
      );
    }
    return ticks;
  };

  // Format MM:SS for active timer
  const minsRemaining = Math.floor(focusSession.remainingSeconds / 60);
  const secsRemaining = focusSession.remainingSeconds % 60;
  const timerStr = `${String(minsRemaining).padStart(2, '0')}:${String(secsRemaining).padStart(2, '0')}`;

  // Time remaining to sleep anchor (derived deterministically)
  const bedtimeCountdownStr = useMemo(() => {
    const hrs = Math.floor(minutesUntilBedtime / 60);
    const mins = minutesUntilBedtime % 60;
    return `${hrs}h ${mins}m to Bedtime`;
  }, [minutesUntilBedtime]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <svg
        ref={dialRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="dial-touch-zone"
        style={{ overflow: 'visible', filter: 'drop-shadow(0 8px 24px rgba(40, 55, 45, 0.05))' }}
      >
        <defs>
          <radialGradient id="masterCenterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#CAD6CD" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#CAD6CD" stopOpacity="0" />
          </radialGradient>
          <filter id="sleepGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Center Glow */}
        <circle cx={center} cy={center} r={radius} fill="url(#masterCenterGlow)" />

        {/* Outer 24-Hour Procedural Ticks */}
        <g>{renderTicks()}</g>

        {/* 24-Hour Markers */}
        <text x={center} y={center - 156} textAnchor="middle" fill="#47594F" fontSize="13" fontWeight="600" className="numeral">
          24
        </text>
        <text x={center + 164} y={center + 5} textAnchor="middle" fill="#47594F" fontSize="13" fontWeight="600" className="numeral">
          6
        </text>
        <text x={center} y={center + 170} textAnchor="middle" fill="#47594F" fontSize="13" fontWeight="600" className="numeral">
          12
        </text>
        <text x={center - 164} y={center + 5} textAnchor="middle" fill="#47594F" fontSize="13" fontWeight="600" className="numeral">
          18
        </text>

        {/* Background Track Circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="16"
        />

        {/* Sleep Window Arc (White Glowing) */}
        <path
          d={calculateSleepArc()}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="18"
          strokeLinecap="round"
          filter="url(#sleepGlow)"
          style={{ opacity: 0.95 }}
        />

        {/* Active Focus Session Arc (Dynamic Overlay) */}
        <path
          d={calculateFocusArc()}
          fill="none"
          stroke={isBreachingBedtime ? '#D9534F' : isEncroachingWindDown ? '#E09F3E' : 'var(--accent-slate)'}
          strokeWidth="16"
          strokeLinecap="round"
          style={{
            opacity: focusSession.active ? 1 : 0.45,
            strokeDasharray: focusSession.active ? 'none' : '4 4',
            transition: 'stroke 0.3s ease, opacity 0.3s ease',
          }}
        />

        {/* Real-Time "Now" Indicator Dot */}
        <g transform={`translate(${nowPos.x}, ${nowPos.y})`}>
          <circle r="7" fill="var(--accent-slate-dark)" stroke="#FFFFFF" strokeWidth="2" />
        </g>

        {/* Sleep Handle (Moon) */}
        <g
          transform={`translate(${sleepPos.x}, ${sleepPos.y})`}
          onPointerDown={(e) => handlePointerDown('sleep', e)}
          style={{ cursor: isLocked ? 'not-allowed' : 'grab' }}
        >
          <circle
            r="16"
            fill="#F4F1EA"
            stroke="rgba(92, 114, 102, 0.2)"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0 3px 8px rgba(30, 45, 35, 0.18))' }}
          />
          <Moon size={13} color="#47594F" x={-6.5} y={-6.5} />
        </g>

        {/* Wake Handle (Sun) */}
        <g
          transform={`translate(${wakePos.x}, ${wakePos.y})`}
          onPointerDown={(e) => handlePointerDown('wake', e)}
          style={{ cursor: isLocked ? 'not-allowed' : 'grab' }}
        >
          <circle
            r="16"
            fill="#F4F1EA"
            stroke="rgba(92, 114, 102, 0.2)"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0 3px 8px rgba(30, 45, 35, 0.18))' }}
          />
          <Sun size={13} color="#47594F" x={-6.5} y={-6.5} />
        </g>
      </svg>

      {/* Center Unified Readout */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          width: 220,
        }}
      >
        {focusSession.active ? (
          /* Active Focus Execution Display */
          <div>
            <div
              className="mono"
              style={{
                fontSize: '34px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-1px',
                lineHeight: 1,
                marginBottom: '4px',
              }}
            >
              {timerStr}
            </div>

            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--accent-slate-dark)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '0 8px',
                marginBottom: '4px',
              }}
            >
              {activeTask ? activeTask.title : `${focusSession.band.replace('_', ' ')} Block`}
            </div>

            <div
              className="numeral"
              style={{
                fontSize: '11px',
                color: isBreachingBedtime ? '#D9534F' : 'var(--text-muted)',
                fontWeight: isBreachingBedtime ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                marginBottom: '10px',
              }}
            >
              {isBreachingBedtime && <AlertTriangle size={11} color="#D9534F" />}
              <span>{bedtimeCountdownStr}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <button
                onClick={onToggleFocus}
                className="btn-slate"
                style={{ padding: '6px 16px', fontSize: '12px', borderRadius: '999px' }}
              >
                {focusSession.paused ? <Play size={12} /> : <Pause size={12} />}
                <span>{focusSession.paused ? 'Resume' : 'Pause'}</span>
              </button>
              <button
                onClick={onResetFocus}
                className="pill-action"
                style={{ padding: '6px', borderRadius: '999px' }}
                title="End Focus Session"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>
        ) : (
          /* Idle Circadian & Pre-Focus Display */
          <div>
            <div
              className="tabular-nums"
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.3px',
                marginBottom: '2px',
              }}
            >
              {formatTime12(sleepTime)} - {formatTime12(wakeTime)}
            </div>

            <div
              className="numeral"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              {duration.text} Rest • {bedtimeCountdownStr}
            </div>

            {/* Bedtime Collision Guard Notice */}
            {isBreachingBedtime ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(217, 83, 79, 0.15)',
                  color: '#D9534F',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 700,
                  marginBottom: '8px',
                }}
              >
                <AlertTriangle size={11} />
                <span>{activeRemainingMins}m Block Breaches Bedtime!</span>
              </div>
            ) : isEncroachingWindDown ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(224, 159, 62, 0.15)',
                  color: '#9C6819',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 700,
                  marginBottom: '8px',
                }}
              >
                <AlertTriangle size={11} />
                <span>Encroaches on {windDownLeadMinutes}m Wind-Down</span>
              </div>
            ) : null}

            {/* Start Focus Button */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={onToggleFocus}
                className="btn-slate"
                style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '999px' }}
              >
                <Play size={13} />
                <span>Start {focusSession.durationMinutes}m Focus</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
