import React from 'react';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { sound } from '../utils/audio';

interface HeaderProps {
  title: string;
  onOpenSettings: () => void;
  onPrevModule?: () => void;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onOpenSettings,
  onPrevModule,
  showBack = true,
}) => {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: '20px',
        padding: '8px 4px',
      }}
    >
      <button
        onClick={() => {
          if (onPrevModule) onPrevModule();
          sound.playDialClick(1200);
        }}
        className="pill-action"
        style={{
          padding: '10px',
          borderRadius: '50%',
          visibility: showBack ? 'visible' : 'hidden',
          backgroundColor: 'transparent',
          border: 'none',
          boxShadow: 'none',
        }}
        aria-label="Back"
      >
        <ArrowLeft size={20} color="var(--text-primary)" />
      </button>

      <h1
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.2px',
        }}
      >
        {title}
      </h1>

      <button
        onClick={() => {
          onOpenSettings();
          sound.playDialClick(1300);
        }}
        className="pill-action"
        style={{
          padding: '10px',
          borderRadius: '50%',
          backgroundColor: 'transparent',
          border: 'none',
          boxShadow: 'none',
        }}
        aria-label="Settings"
      >
        <SettingsIcon size={20} color="var(--text-primary)" />
      </button>
    </header>
  );
};
