import type { JarvisGlobalState } from '../types';

const STORAGE_KEY = 'jarvis_productivity_state_v1';

export const DEFAULT_STATE: JarvisGlobalState = {
  circadian: {
    sleepTime: '01:30',
    wakeTime: '08:30',
    isLocked: false,
    windDownEnabled: true,
    windDownLeadMinutes: 30,
    graceMinutesAdded: 0,
    graceExpiresAt: null,
  },
  tasks: [
    {
      id: 't-1',
      title: 'Deploy Edge Security Architecture',
      priority: 'deep_focus',
      urgencyScore: 10.0,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      estimatedMinutes: 45,
    },
    {
      id: 't-2',
      title: 'Synchronize Circadian Anchors',
      priority: 'quick_win',
      urgencyScore: 7.5,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      estimatedMinutes: 25,
    },
    {
      id: 't-3',
      title: 'Audit Distraction Process Vectors',
      priority: 'deep_focus',
      urgencyScore: 8.5,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      estimatedMinutes: 45,
    },
    {
      id: 't-4',
      title: 'Evaluate Qwen 2.5 3B Local Weights',
      priority: 'backburner',
      urgencyScore: 3.0,
      completed: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      completedAt: new Date().toISOString(),
      estimatedMinutes: 90,
    },
  ],
  focusSession: {
    active: false,
    paused: false,
    band: 'deep_focus',
    durationMinutes: 45,
    remainingSeconds: 45 * 60,
    taskId: null,
    sessionStartTime: null,
  },
  metrics: [
    {
      day: 'Mon',
      date: '2026-11-20',
      sleepDurationHours: 7.0,
      targetSleepHours: 7.0,
      focusScore: 94,
      deepWorkHours: 5.8,
      tasksCompleted: 6,
      adherenceScore: 96,
    },
    {
      day: 'Tue',
      date: '2026-11-21',
      sleepDurationHours: 6.8,
      targetSleepHours: 7.0,
      focusScore: 88,
      deepWorkHours: 4.5,
      tasksCompleted: 5,
      adherenceScore: 90,
    },
    {
      day: 'Wed',
      date: '2026-11-22',
      sleepDurationHours: 7.2,
      targetSleepHours: 7.0,
      focusScore: 92,
      deepWorkHours: 5.5,
      tasksCompleted: 7,
      adherenceScore: 95,
    },
    {
      day: 'Thu',
      date: '2026-11-23',
      sleepDurationHours: 7.0,
      targetSleepHours: 7.0,
      focusScore: 95,
      deepWorkHours: 6.2,
      tasksCompleted: 8,
      adherenceScore: 98,
    },
    {
      day: 'Fri',
      date: '2026-11-24',
      sleepDurationHours: 7.0,
      targetSleepHours: 7.0,
      focusScore: 86,
      deepWorkHours: 4.8,
      tasksCompleted: 5,
      adherenceScore: 88,
    },
    {
      day: 'Sat',
      date: '2026-11-25',
      sleepDurationHours: 7.5,
      targetSleepHours: 7.0,
      focusScore: 82,
      deepWorkHours: 3.5,
      tasksCompleted: 4,
      adherenceScore: 85,
    },
    {
      day: 'Sun',
      date: '2026-11-26',
      sleepDurationHours: 7.0,
      targetSleepHours: 7.0,
      focusScore: 91,
      deepWorkHours: 5.4,
      tasksCompleted: 6,
      adherenceScore: 92,
    },
  ],
  settings: {
    soundEnabled: true,
    strictnessLevel: 1,
    hapticFeedback: true,
    autoDistractionShield: true,
  },
  selectedMetricDayIndex: 6, // Sunday / Today
};

export function loadState(): JarvisGlobalState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      circadian: { ...DEFAULT_STATE.circadian, ...(parsed.circadian || {}) },
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
      focusSession: { ...DEFAULT_STATE.focusSession, ...(parsed.focusSession || {}) },
    };
  } catch (e) {
    console.error('Failed to load Jarvis state from localStorage:', e);
    return DEFAULT_STATE;
  }
}

export function saveState(state: JarvisGlobalState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save Jarvis state to localStorage:', e);
  }
}

export function resetState(): JarvisGlobalState {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  return DEFAULT_STATE;
}
