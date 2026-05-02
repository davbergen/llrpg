import React from 'react';
import type { ScreenProps } from '../types';
import { DUNGEON_MONSTERS, DUNGEON_NAME } from '../game/dungeon';
import {
  RPG,
  PixelPanel,
  PixelHeader,
  PixelButton,
  StatBar,
  XPBar,
  CharSprite,
} from '../components/rpg';

const classColors: Record<string, string> = {
  mage: '#9b5de5',
  warrior: '#c44b4b',
  rogue: '#4caf50',
  scholar: '#4a9edd',
};

const Home: React.FC<ScreenProps> = ({ hero, gameState, setScreen }) => {
  const { hp, maxHp, xp, maxXp, level, gold, dungeonState } = gameState;
  const heroColor = classColors[hero.classType] ?? RPG.gold;

  const cleared = dungeonState.currentMonsterIndex >= DUNGEON_MONSTERS.length;
  const progress = Math.min(dungeonState.currentMonsterIndex, DUNGEON_MONSTERS.length);
  const ctaLabel = cleared
    ? 'DUNGEON CLEARED ✓'
    : dungeonState.currentMonsterIndex === 0 &&
        dungeonState.currentMonsterHp === DUNGEON_MONSTERS[0].maxHp
      ? '▶ ENTER DUNGEON'
      : '▶ CONTINUE DUNGEON';

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Hero summary */}
      <PixelPanel gold style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <CharSprite classType={hero.classType} size={56} />
          <div
            style={{
              position: 'absolute',
              bottom: -4,
              right: -8,
              background: heroColor,
              border: `2px solid ${RPG.bg}`,
              fontFamily: "'Press Start 2P'",
              fontSize: 8,
              color: '#fff',
              padding: '2px 5px',
              boxShadow: '2px 2px 0 rgba(0,0,0,0.5)',
            }}
          >
            {level}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 12,
              color: RPG.gold,
              marginBottom: 4,
            }}
          >
            {hero.name}
          </div>
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 8,
              color: heroColor,
              marginBottom: 10,
              textTransform: 'uppercase',
            }}
          >
            {hero.classType}
          </div>
          <XPBar xp={xp} maxXp={maxXp} level={level} />
          <StatBar label="HP" value={hp} max={maxHp} color={RPG.red} icon="❤" />
        </div>
      </PixelPanel>

      {/* Gold strip */}
      <PixelPanel
        dark
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
        }}
      >
        <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: RPG.textDim }}>
          GOLD
        </span>
        <span style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: RPG.gold }}>
          💰 {gold}
        </span>
      </PixelPanel>

      {/* Dungeon card */}
      <div>
        <PixelHeader size={10}>🏰 CURRENT DUNGEON</PixelHeader>
        <PixelPanel style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 32 }}>🌲</div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: 10,
                  color: RPG.text,
                  marginBottom: 4,
                }}
              >
                {DUNGEON_NAME}
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: 8,
                  color: RPG.textDim,
                }}
              >
                {progress}/{DUNGEON_MONSTERS.length} CLEARED
              </div>
            </div>
          </div>
          <div
            style={{
              height: 10,
              background: '#0a0a14',
              border: `2px solid ${RPG.border}`,
              overflow: 'hidden',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: `${(progress / DUNGEON_MONSTERS.length) * 100}%`,
                height: '100%',
                background: cleared ? RPG.green : RPG.gold,
                transition: 'width 0.4s',
              }}
            />
          </div>
          <PixelButton
            onClick={() => setScreen('dungeon')}
            disabled={cleared}
            style={{ width: '100%' }}
            variant={cleared ? 'gold' : 'green'}
          >
            {ctaLabel}
          </PixelButton>
        </PixelPanel>
      </div>
    </div>
  );
};

export default Home;
