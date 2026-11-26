import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import type { ActiveTab } from './components/Navigation';
import { SettingsModal } from './components/SettingsModal';
import { CircadianDial } from './components/dials/CircadianDial';
import { CircadianControls } from './components/circadian/CircadianControls';
import { WeeklyRhythmSheet } from './components/circadian/WeeklyRhythmSheet';
import { PrioritizerDial } from './components/dials/PrioritizerDial';
import { TaskCard } from './components/tasks/TaskCard';
import { AddTaskModal } from './components/tasks/AddTaskModal';
import { TaskActionSheet } from './components/tasks/TaskActionSheet';
import { AnalyticsDial } from './components/dials/AnalyticsDial';
import { ExecutiveReportSheet } from './components/analytics/ExecutiveReportSheet';
import { loadState, saveState, resetState } from './utils/storage';
import type { JarvisGlobalState, PriorityBand, TaskItem } from './types';
import { sound } from './utils/audio';
import { Plus, FileText, CheckCircle2 } from 'lucide-react';

export function App() {
  const [state, setState] = useState<JarvisGlobalState>(loadState);
  const [activeTab, setActiveTab] = useState<ActiveTab>('circadian');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRhythmSheetOpen, setIsRhythmSheetOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedTaskForAction, setSelectedTaskForAction] = useState<TaskItem | null>(null);
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'Day' | 'Week' | 'Month'>('Week');

  // Sync to localStorage
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Sync audio enabled setting
  useEffect(() => {
    sound.setSoundEnabled(state.settings.soundEnabled);
  }, [state.settings.soundEnabled]);

  // Active Focus Session Countdown Timer
  useEffect(() => {
    if (!state.focusSession.active || state.focusSession.paused) return;

    const interval = setInterval(() => {
      setState((prev) => {
        if (prev.focusSession.remainingSeconds <= 1) {
          sound.playFocusBell();
          return {
            ...prev,
            focusSession: {
              ...prev.focusSession,
              active: false,
              paused: false,
              remainingSeconds: prev.focusSession.durationMinutes * 60,
            },
          };
        }
        return {
          ...prev,
          focusSession: {
            ...prev.focusSession,
            remainingSeconds: prev.focusSession.remainingSeconds - 1,
          },
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.focusSession.active, state.focusSession.paused]);

  // Circadian Handlers
  const handleTimeChange = (sleep: string, wake: string) => {
    setState((prev) => ({
      ...prev,
      circadian: {
        ...prev.circadian,
        sleepTime: sleep,
        wakeTime: wake,
      },
    }));
  };

  const handleToggleLock = () => {
    const nextLocked = !state.circadian.isLocked;
    setState((prev) => ({
      ...prev,
      circadian: {
        ...prev.circadian,
        isLocked: nextLocked,
      },
    }));
    sound.playLockChime(nextLocked);
  };

  const handleToggleWindDown = () => {
    setState((prev) => ({
      ...prev,
      circadian: {
        ...prev.circadian,
        windDownEnabled: !prev.circadian.windDownEnabled,
      },
    }));
  };

  const handleSelectLeadTime = (mins: 15 | 30 | 45) => {
    setState((prev) => ({
      ...prev,
      circadian: {
        ...prev.circadian,
        windDownLeadMinutes: mins,
      },
    }));
  };

  const handleAddGrace = () => {
    const expiresAt = Date.now() + 15 * 60 * 1000;
    setState((prev) => ({
      ...prev,
      circadian: {
        ...prev.circadian,
        graceMinutesAdded: prev.circadian.graceMinutesAdded + 15,
        graceExpiresAt: expiresAt,
      },
    }));
    sound.playDialClick(1500);
  };

  // Task & Focus Handlers
  const handleDurationChange = (minutes: number) => {
    setState((prev) => ({
      ...prev,
      focusSession: {
        ...prev.focusSession,
        durationMinutes: minutes,
        remainingSeconds: minutes * 60,
      },
    }));
  };

  const handleBandChange = (band: PriorityBand) => {
    setState((prev) => ({
      ...prev,
      focusSession: {
        ...prev.focusSession,
        band,
      },
    }));
  };

  const handleTogglePlayFocus = () => {
    setState((prev) => {
      const fs = prev.focusSession;
      if (!fs.active) {
        sound.playDialClick(1600);
        return {
          ...prev,
          focusSession: {
            ...fs,
            active: true,
            paused: false,
            sessionStartTime: Date.now(),
          },
        };
      } else {
        const nextPaused = !fs.paused;
        sound.playDialClick(nextPaused ? 1100 : 1500);
        return {
          ...prev,
          focusSession: {
            ...fs,
            paused: nextPaused,
          },
        };
      }
    });
  };

  const handleResetTimer = () => {
    setState((prev) => ({
      ...prev,
      focusSession: {
        ...prev.focusSession,
        active: false,
        paused: false,
        remainingSeconds: prev.focusSession.durationMinutes * 60,
      },
    }));
    sound.playDialClick(900);
  };

  const handleAddTask = (title: string, priority: PriorityBand, estimatedMins: number) => {
    const urgency = priority === 'deep_focus' ? 10.0 : priority === 'quick_win' ? 7.5 : 3.0;
    const newTask: TaskItem = {
      id: `t-${Date.now()}`,
      title,
      priority,
      urgencyScore: urgency,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      estimatedMinutes: estimatedMins,
    };
    setState((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));
  };

  const handleToggleTaskComplete = (taskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : null,
            }
          : t
      ),
    }));
  };

  const handleStartFocusOnTask = (task: TaskItem) => {
    setState((prev) => ({
      ...prev,
      focusSession: {
        active: true,
        paused: false,
        band: task.priority,
        durationMinutes: task.estimatedMinutes,
        remainingSeconds: task.estimatedMinutes * 60,
        taskId: task.id,
        sessionStartTime: Date.now(),
      },
    }));
  };

  const handleChangeTaskPriority = (taskId: string, newPriority: PriorityBand) => {
    const newUrgency = newPriority === 'deep_focus' ? 10.0 : newPriority === 'quick_win' ? 7.5 : 3.0;
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, priority: newPriority, urgencyScore: newUrgency } : t
      ),
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
  };

  // Reset System Handler
  const handleResetDefaults = () => {
    const fresh = resetState();
    setState(fresh);
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'circadian':
        return 'Circadian Anchor';
      case 'tasks':
        return 'Dynamic Task Prioritizer';
      case 'analytics':
        return 'Daily Analytics Engine';
    }
  };

  const currentDayMetric = state.metrics[state.selectedMetricDayIndex] || state.metrics[state.metrics.length - 1];

  return (
    <div className="app-viewport">
      {/* Top Header */}
      <Header
        title={getHeaderTitle()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        showBack={false}
      />

      {/* MODULE 1: CIRCADIAN ANCHOR */}
      {activeTab === 'circadian' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Continuous Rotating 24-Hour Dial */}
          <CircadianDial
            sleepTime={state.circadian.sleepTime}
            wakeTime={state.circadian.wakeTime}
            isLocked={state.circadian.isLocked}
            onTimeChange={handleTimeChange}
          />

          {/* 3 Horizontal Controls: Lock Schedule, Wind-Down, Grace +15m */}
          <CircadianControls
            schedule={state.circadian}
            onToggleLock={handleToggleLock}
            onToggleWindDown={handleToggleWindDown}
            onSelectLeadTime={handleSelectLeadTime}
            onAddGrace={handleAddGrace}
          />

          {/* Slide-Up Weekly Rhythm Sheet at bottom */}
          <WeeklyRhythmSheet
            metrics={state.metrics}
            isOpen={isRhythmSheetOpen}
            onToggle={() => setIsRhythmSheetOpen(!isRhythmSheetOpen)}
          />
        </div>
      )}

      {/* MODULE 2: DYNAMIC TASK PRIORITIZER */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          {/* Rotating Focus Dial */}
          <PrioritizerDial
            session={state.focusSession}
            onDurationChange={handleDurationChange}
            onBandChange={handleBandChange}
            onTogglePlay={handleTogglePlayFocus}
            onResetTimer={handleResetTimer}
          />

          {/* Directives Ledger Header & Add Action */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '28px',
              marginBottom: '14px',
              padding: '0 4px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Urgent Directives Ledger
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {state.tasks.filter((t) => !t.completed).length} Pending • Dynamically Prioritized
              </div>
            </div>

            <button
              onClick={() => setIsAddTaskOpen(true)}
              className="pill-action"
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              <Plus size={14} />
              <span>Log Directive</span>
            </button>
          </div>

          {/* Task Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {state.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={handleToggleTaskComplete}
                onOpenActions={(t) => setSelectedTaskForAction(t)}
              />
            ))}
          </div>
        </div>
      )}

      {/* MODULE 3: DAILY ANALYTICS ENGINE */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {/* Timeframe Selector Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              marginBottom: '16px',
              backgroundColor: 'var(--card-alabaster)',
              padding: '4px',
              borderRadius: '999px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {(['Day', 'Week', 'Month'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  setAnalyticsTimeframe(tf);
                  sound.playDialClick(1300);
                }}
                style={{
                  padding: '6px 16px',
                  borderRadius: '999px',
                  border: 'none',
                  backgroundColor: analyticsTimeframe === tf ? 'var(--accent-slate)' : 'transparent',
                  color: analyticsTimeframe === tf ? '#FFF' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Scrubbing Dial Across Days */}
          <AnalyticsDial
            metrics={state.metrics}
            selectedIndex={state.selectedMetricDayIndex}
            onSelectDay={(idx) => setState((p) => ({ ...p, selectedMetricDayIndex: idx }))}
          />

          {/* Clean Summary Metric Cards (Alabaster) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              width: '100%',
              marginTop: '20px',
            }}
          >
            <div className="card-alabaster" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>FOCUS SCORE</div>
              <div className="numeral" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {currentDayMetric.focusScore}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-slate-dark)', marginTop: '2px' }}>+4% vs Baseline</div>
            </div>

            <div className="card-alabaster" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>DEEP WORK</div>
              <div className="numeral" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {currentDayMetric.deepWorkHours}h
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Target: 6.0h</div>
            </div>

            <div className="card-alabaster" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>DIRECTIVES ARCHIVED</div>
              <div className="numeral" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {currentDayMetric.tasksCompleted} / {state.tasks.length}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Completion Nominal</div>
            </div>

            <div className="card-alabaster" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>CIRCADIAN ALIGNMENT</div>
              <div className="numeral" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {currentDayMetric.sleepDurationHours}h
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-slate-dark)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <CheckCircle2 size={12} />
                <span>On Target (01:30)</span>
              </div>
            </div>
          </div>

          {/* Trigger for Executive Debrief Report */}
          <button
            onClick={() => {
              setIsReportSheetOpen(true);
              sound.playDialClick(1400);
            }}
            className="btn-slate"
            style={{ width: '100%', marginTop: '16px', padding: '14px' }}
          >
            <FileText size={16} />
            <span>Generate Jarvis Executive Briefing</span>
          </button>
        </div>
      )}

      {/* Bottom Floating Navigation Pill */}
      <Navigation activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />

      {/* Modals & Action Sheets */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={state.settings}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={(newSet) => setState((p) => ({ ...p, settings: { ...p.settings, ...newSet } }))}
        onResetDefaults={handleResetDefaults}
      />

      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onAddTask={handleAddTask}
      />

      <TaskActionSheet
        task={selectedTaskForAction}
        isOpen={selectedTaskForAction !== null}
        onClose={() => setSelectedTaskForAction(null)}
        onStartFocus={handleStartFocusOnTask}
        onChangePriority={handleChangeTaskPriority}
        onDeleteTask={handleDeleteTask}
        onToggleComplete={handleToggleTaskComplete}
      />

      <ExecutiveReportSheet
        isOpen={isReportSheetOpen}
        state={state}
        onClose={() => setIsReportSheetOpen(false)}
      />
    </div>
  );
}

export default App;
