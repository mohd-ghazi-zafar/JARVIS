import React from 'react';
import { Moon, Target, BarChart3 } from 'lucide-react';
import { sound } from '../utils/audio';

export type ActiveTab = 'circadian' | 'tasks' | 'analytics';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'circadian', label: 'Circadian', icon: <Moon size={18} /> },
    { id: 'tasks', label: 'Prioritizer', icon: <Target size={18} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 40px)',
        maxWidth: '380px',
        backgroundColor: 'var(--card-alabaster)',
        padding: '6px 8px',
        borderRadius: '999px',
        display: 'flex',
        justifyContent: 'space-around',
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
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: isActive ? 'var(--accent-slate)' : 'transparent',
              color: isActive ? 'var(--white)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
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
