import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Moon, Sun, Lock } from 'lucide-react';
import {
  formatTime12,
  calculateDurationHoursMinutes,
  minutesToAngle,
  angleToMinutes,
  getAngleFromCenter,
  getCoordinatesOnCircle,
  minutesToTime,
  timeToMinutes
} from '../../utils/time';
import { sound } from '../../utils/audio';

interface CircadianDialProps {
  sleepTime: string;
  wakeTime: string;
  isLocked: boolean;
  onTimeChange: (sleep: string, wake: string) => void;
}

export const CircadianDial: React.FC<CircadianDialProps> = ({
  sleepTime,
  wakeTime,
  isLocked,
  onTimeChange,
}) => {
  const dialRef = useRef<SVGSVGElement | null>(null);
  const [activeThumb, setActiveThumb] = useState<'sleep' | 'wake' | null>(null);

  const size = 320;
  const center = size / 2;
  const radius = 114;

  const sleepMinutes = timeToMinutes(sleepTime);
  const wakeMinutes = timeToMinutes(wakeTime);

  const sleepAngle = minutesToAngle(sleepMinutes);
  const wakeAngle = minutesToAngle(wakeMinutes);

  const duration = calculateDurationHoursMinutes(sleepTime, wakeTime);

  // Knob Coordinates
  const sleepPos = getCoordinatesOnCircle(center, center, radius, sleepAngle);
  const wakePos = getCoordinatesOnCircle(center, center, radius, wakeAngle);

  // SVG Arc calculation from sleepAngle to wakeAngle (clockwise)
  const calculateArcPath = () => {
    let sweep = (wakeAngle - sleepAngle + 360) % 360;
    if (sweep === 0) sweep = 360;
    const largeArc = sweep > 180 ? 1 : 0;

    return `M ${sleepPos.x} ${sleepPos.y} A ${radius} ${radius} 0 ${largeArc} 1 ${wakePos.x} ${wakePos.y}`;
  };

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
    const snappedMins = angleToMinutes(angle, 15); // snap to 15-min increments
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

  // Generate 24-Hour radial tick marks
  const renderTicks = () => {
    const ticks = [];
    const totalTicks = 96; // every 15 minutes (96 ticks)
    for (let i = 0; i < totalTicks; i++) {
      const angle = (i / totalTicks) * 360;
      const isMajorHour = i % 4 === 0;
      const isQuarterTick = i % 24 === 0; // 0, 6, 12, 18
      const tickLength = isQuarterTick ? 10 : isMajorHour ? 7 : 4;
      const tickRadius = 146;

      const p1 = getCoordinatesOnCircle(center, center, tickRadius - tickLength, angle);
      const p2 = getCoordinatesOnCircle(center, center, tickRadius, angle);

      ticks.push(
        <line
          key={`tick-${i}`}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={isQuarterTick ? 'rgba(75, 95, 85, 0.7)' : isMajorHour ? 'rgba(92, 114, 102, 0.45)' : 'rgba(92, 114, 102, 0.22)'}
          strokeWidth={isQuarterTick ? 2 : isMajorHour ? 1.5 : 1}
          strokeLinecap="round"
        />
      );
    }
    return ticks;
  };

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
          <radialGradient id="dialCenterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#CAD6CD" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#CAD6CD" stopOpacity="0" />
          </radialGradient>
          <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Center Glow */}
        <circle cx={center} cy={center} r={radius} fill="url(#dialCenterGlow)" />

        {/* Outer 24-Hour Procedural Ticks */}
        <g>{renderTicks()}</g>

        {/* Hour Label Markers (24, 6, 12, 18) matching design image */}
        <text x={center} y={center - 150} textAnchor="middle" fill="#47594F" fontSize="13" fontWeight="600" className="numeral">
          24
        </text>
        <text x={center + 158} y={center + 5} textAnchor="middle" fill="#47594F" fontSize="13" fontWeight="600" className="numeral">
          6
        </text>
        <text x={center} y={center + 164} textAnchor="middle" fill="#47594F" fontSize="13" fontWeight="600" className="numeral">
          12
        </text>
        <text x={center - 158} y={center + 5} textAnchor="middle" fill="#47594F" fontSize="13" fontWeight="600" className="numeral">
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

        {/* Glowing Active Sleep Arc */}
        <path
          d={calculateArcPath()}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="18"
          strokeLinecap="round"
          filter="url(#arcGlow)"
          style={{ opacity: 0.95 }}
        />

        {/* Sleep Handle (Moon Disc) */}
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

        {/* Wake Handle (Sun Disc) */}
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

      {/* Center Readout (Aligned with uploaded image design) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          width: 220,
        }}
      >
        <div
          className="tabular-nums"
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.3px',
            marginBottom: '4px',
          }}
        >
          {formatTime12(sleepTime)} - {formatTime12(wakeTime)}
        </div>
        <div
          className="numeral"
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            opacity: 0.9,
          }}
        >
          {duration.text}
        </div>

        {isLocked && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '8px',
              padding: '3px 10px',
              backgroundColor: 'rgba(92, 114, 102, 0.18)',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--accent-slate-dark)',
            }}
          >
            <Lock size={10} />
            <span>ENFORCED</span>
          </div>
        )}
      </div>
    </div>
  );
};
