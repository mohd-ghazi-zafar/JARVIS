// Mathematical and Time utility functions for 24-hour radial dials

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h % 24) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function formatTime12(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hours12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hours12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function calculateDurationHoursMinutes(sleepStr: string, wakeStr: string): { hours: number; minutes: number; text: string } {
  const sleepMins = timeToMinutes(sleepStr);
  const wakeMins = timeToMinutes(wakeStr);
  let diff = wakeMins - sleepMins;
  if (diff <= 0) {
    diff += 1440; // crosses midnight
  }
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return {
    hours,
    minutes,
    text: minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h 0m`,
  };
}

// Polar Angle conversions (0 deg is top / 24:00, clockwise)
export function minutesToAngle(minutes: number): number {
  // 1440 mins = 360 degrees => 1 min = 0.25 deg
  return (minutes / 1440) * 360;
}

export function angleToMinutes(angleDeg: number, snapMinutes: number = 15): number {
  let normalized = ((angleDeg % 360) + 360) % 360;
  let rawMinutes = (normalized / 360) * 1440;
  let snapped = Math.round(rawMinutes / snapMinutes) * snapMinutes;
  return (snapped + 1440) % 1440;
}

// Calculates angle from center (x, y) to mouse/touch point (px, py)
export function getAngleFromCenter(centerX: number, centerY: number, px: number, py: number): number {
  const dx = px - centerX;
  const dy = py - centerY;
  // Math.atan2 returns -PI to PI where 0 is (1, 0) right.
  // We want 0 at top (0, -1), so rotate by +90 deg.
  let rad = Math.atan2(dy, dx);
  let deg = (rad * 180) / Math.PI + 90;
  return ((deg % 360) + 360) % 360;
}

export function getCoordinatesOnCircle(centerX: number, centerY: number, radius: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(rad),
    y: centerY + radius * Math.sin(rad),
  };
}

// Calculate remaining countdown to sleep
export function getBedtimeCountdown(sleepStr: string): string {
  const now = new Date();
  const [targetH, targetM] = sleepStr.split(':').map(Number);
  const target = new Date();
  target.setHours(targetH, targetM, 0, 0);

  if (target.getTime() <= now.getTime()) {
    // Check if within 4 hours past bedtime
    const diffHours = (now.getTime() - target.getTime()) / (1000 * 3600);
    if (diffHours < 4) {
      return 'Anchor Breached';
    }
    target.setDate(target.getDate() + 1);
  }

  const diffMs = target.getTime() - now.getTime();
  const hrs = Math.floor(diffMs / (1000 * 3600));
  const mins = Math.floor((diffMs % (1000 * 3600)) / (1000 * 60));
  return `In ${hrs}h ${mins}m`;
}
