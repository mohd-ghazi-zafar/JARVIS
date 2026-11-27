import React from 'react';
import { Compass, Moon, Target, BarChart3 } from 'lucide-react';
import { sound } from '../utils/audio';

export type ActiveTab = 'core' | 'circadian' | 'tasks' | 'analytics';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'core', label: 'Core', icon: <Compass size={16} /> },
    { id: 'circadian', label: 'Circadian', icon: <Moon size={16} /> },
    { id: 'tasks', label: 'Prioritizer', icon: <Target size={16} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '410px',
        backgroundColor: 'var(--card-alabaster)',
        padding: '5px',
        borderRadius: '999px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '4px',
        boxShadow: 'var(--shadow-float)',
        border: '1px solid var(--border-subtle)',
        zIndex: 50,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => {
              onTabChange(tab.id);
              sound.playDialClick(1350);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 12px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: isActive ? 'var(--accent-slate)' : 'transparent',
              color: isActive ? 'var(--white)' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              flex: 1,
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
