import React, { useState } from 'react';
import type { ScreenProps } from '../types';
import { RPG, PixelHeader, PixelButton } from '../components/rpg';
import AccountSection from './AccountSection';
import { isBgmMuted, setBgmMuted } from '../bgm';

const Settings: React.FC<ScreenProps> = ({ setScreen }) => {
  const [musicOn, setMusicOn] = useState(!isBgmMuted());

  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    setBgmMuted(!next);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 16px 12px',
          borderBottom: `3px solid ${RPG.border}`,
        }}
      >
        <button
          onClick={() => setScreen('profile')}
          aria-label="Back to hero"
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: 9,
            color: RPG.gold,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ◀ HERO
        </button>
        <div style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: RPG.gold }}>
          SETTINGS
        </div>
      </div>

      {/* Audio */}
      <div style={{ padding: '14px 16px', borderBottom: `3px solid ${RPG.border}` }}>
        <PixelHeader size={9}>AUDIO</PixelHeader>
        <PixelButton onClick={toggleMusic} variant={musicOn ? 'green' : 'grey'} small>
          {musicOn ? '🔊 MUSIC: ON' : '🔇 MUSIC: OFF'}
        </PixelButton>
      </div>

      {/* Account + data (sign-in/out, export, delete, legal) */}
      <AccountSection />
    </div>
  );
};

export default Settings;
