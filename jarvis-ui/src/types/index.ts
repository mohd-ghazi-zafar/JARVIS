export type PriorityBand = 'deep_focus' | 'quick_win' | 'backburner';

export interface CircadianSchedule {
  sleepTime: string; // "01:30"
  wakeTime: string;  // "08:30"
  isLocked: boolean;
  windDownEnabled: boolean;
  windDownLeadMinutes: 15 | 30 | 45;
  graceMinutesAdded: number;
  graceExpiresAt: number | null; // timestamp
}

export interface TaskItem {
  id: string;
  title: string;
  priority: PriorityBand;
  urgencyScore: number;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  estimatedMinutes: number;
}

export interface FocusSession {
  active: boolean;
  paused: boolean;
  band: PriorityBand;
  durationMinutes: number;
  remainingSeconds: number;
  taskId: string | null;
  sessionStartTime: number | null;
}

export interface DayMetric {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  date: string;
  sleepDurationHours: number;
  targetSleepHours: number;
  focusScore: number; // 0-100
  deepWorkHours: number;
  tasksCompleted: number;
  adherenceScore: number; // 0-100
}

export interface JarvisSettings {
  soundEnabled: boolean;
  strictnessLevel: 1 | 2 | 3;
  hapticFeedback: boolean;
  autoDistractionShield: boolean;
}

export interface JarvisGlobalState {
  circadian: CircadianSchedule;
  tasks: TaskItem[];
  focusSession: FocusSession;
  metrics: DayMetric[];
  settings: JarvisSettings;
  selectedMetricDayIndex: number; // 0-6
}
