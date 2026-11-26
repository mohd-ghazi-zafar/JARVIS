import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { DayMetric } from '../../types';
import { getAngleFromCenter, getCoordinatesOnCircle } from '../../utils/time';
import { sound } from '../../utils/audio';

interface AnalyticsDialProps {
  metrics: DayMetric[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
}

export const AnalyticsDial: React.FC<AnalyticsDialProps> = ({
  metrics,
  selectedIndex,
  onSelectDay,
}) => {
  const dialRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const size = 300;
  const center = size / 2;
  const radius = 108;

  const currentMetric = metrics[selectedIndex] || metrics[metrics.length - 1];

  // Map 7 days across 360 degrees (0: Mon, 1: Tue, ... 6: Sun)
  const anglePerDay = 360 / 7;
  const currentAngle = selectedIndex * anglePerDay;
  const knobPos = getCoordinatesOnCircle(center, center, radius, currentAngle);

  // Adherence radial gauge in center
  const adherenceRatio = currentMetric.adherenceScore / 100;
  const gaugeRadius = 68;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeStrokeDash = adherenceRatio * gaugeCircumference;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    sound.playDialClick(1400);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging || !dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const angle = getAngleFromCenter(cx, cy, e.clientX, e.clientY);
    const closestIdx = Math.round(angle / anglePerDay) % 7;

    if (closestIdx !== selectedIndex) {
      onSelectDay(closestIdx);
      sound.playDialClick(900 + closestIdx * 60);
    }
  }, [anglePerDay, isDragging, onSelectDay, selectedIndex]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <svg
        ref={dialRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="dial-touch-zone"
      >
        <defs>
          <radialGradient id="analyticsGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#CAD6CD" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={center} cy={center} r={radius} fill="url(#analyticsGlow)" />

        {/* Outer Circular Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="12"
        />

        {/* 7 Day Nodes & Day Labels */}
        {metrics.map((m, idx) => {
          const angle = idx * anglePerDay;
          const pos = getCoordinatesOnCircle(center, center, radius, angle);
          const isSelected = selectedIndex === idx;
          const labelPos = getCoordinatesOnCircle(center, center, radius + 24, angle);

          return (
            <g key={m.day} onClick={() => { onSelectDay(idx); sound.playDialClick(1100); }} style={{ cursor: 'pointer' }}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isSelected ? 5 : 3}
                fill={isSelected ? 'var(--accent-slate)' : 'rgba(92, 114, 102, 0.5)'}
              />
              <text
                x={labelPos.x}
                y={labelPos.y + 4}
                textAnchor="middle"
                fontSize="12"
                fontWeight={isSelected ? 700 : 500}
                fill={isSelected ? 'var(--accent-slate-dark)' : 'var(--text-muted)'}
              >
                {m.day}
              </text>
            </g>
          );
        })}

        {/* Inner Radial Adherence Gauge */}
        <circle
          cx={center}
          cy={center}
          r={gaugeRadius}
          fill="none"
          stroke="rgba(92, 114, 102, 0.12)"
          strokeWidth="8"
        />
        <circle
          cx={center}
          cy={center}
          r={gaugeRadius}
          fill="none"
          stroke="var(--accent-slate)"
          strokeWidth="8"
          strokeDasharray={`${gaugeStrokeDash} ${gaugeCircumference}`}
          strokeDashoffset={gaugeCircumference / 4}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.3s ease' }}
        />

        {/* Scrubbing Knob Handle */}
        <g
          transform={`translate(${knobPos.x}, ${knobPos.y})`}
          onPointerDown={handlePointerDown}
          style={{ cursor: 'grab' }}
        >
          <circle
            r="15"
            fill="#F4F1EA"
            stroke="rgba(92, 114, 102, 0.25)"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0 3px 8px rgba(35, 50, 40, 0.2))' }}
          />
          <circle r="4" fill="var(--accent-slate)" />
        </g>
      </svg>

      {/* Center Gauge Readout */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          width: 140,
        }}
      >
        <div
          className="numeral"
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-1px',
            lineHeight: 1,
          }}
        >
          {currentMetric.adherenceScore}%
        </div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--text-secondary)',
            marginTop: '4px',
          }}
        >
          {currentMetric.day} Adherence
        </div>
        <div
          className="numeral"
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginTop: '2px',
          }}
        >
          {currentMetric.deepWorkHours}h Focus
        </div>
      </div>
    </div>
  );
};
