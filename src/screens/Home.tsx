import React, { useEffect, useState } from 'react';
import type { ScreenProps } from '../types';
import { DUNGEONS, getDungeon, isDungeonUnlocked, freshProgress } from '../game/dungeon';
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
  priest: '#f4e060',
};

const Home: React.FC<ScreenProps> = ({ hero, gameState, setGameState, setScreen }) => {
  const { hp, maxHp, xp, maxXp, level, gold, dungeonState } = gameState;
  const heroColor = classColors[hero.classType] ?? RPG.gold;
  const [showSelect, setShowSelect] = useState(false);

  useEffect(() => {
    if (hp < maxHp) {
      setGameState((prev) => ({ ...prev, hp: prev.maxHp }));
    }
    // Run only on Home mount — restore at the safe haven
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeDungeon = getDungeon(dungeonState.activeDungeonId);
  const activeProgress =
    dungeonState.progress[dungeonState.activeDungeonId] ?? freshProgress(activeDungeon.monsters);
  const totalMonsters = activeDungeon.monsters.length;
  const cleared = activeProgress.cleared;
  const progress = Math.min(activeProgress.currentMonsterIndex, totalMonsters);
  const dungeon1Cleared = dungeonState.progress[DUNGEONS[0].meta.id]?.cleared === true;

  const ctaLabel = cleared
    ? 'DUNGEON CLEARED ✓'
    : activeProgress.currentMonsterIndex === 0 &&
        activeProgress.currentMonsterHp === activeDungeon.monsters[0].maxHp &&
        activeProgress.lastActionAt === 0
      ? '▶ ENTER DUNGEON'
      : '▶ CONTINUE DUNGEON';

  const handlePick = (dungeonId: string) => {
    setGameState((prev) => {
      const existing = prev.dungeonState.progress[dungeonId];
      const dungeon = getDungeon(dungeonId);
      return {
        ...prev,
        dungeonState: {
          ...prev.dungeonState,
          activeDungeonId: dungeonId,
          progress: existing
            ? prev.dungeonState.progress
            : {
                ...prev.dungeonState.progress,
                [dungeonId]: freshProgress(dungeon.monsters),
              },
          pendingDamageMultiplier: undefined,
        },
      };
    });
    setShowSelect(false);
  };

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

      {/* Streak strip */}
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
          STREAK
        </span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 11, color: '#ff9a3c' }}>
            🔥 {gameState.streakState.count}
          </span>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 11, color: '#4a9edd' }}>
            ❄ {gameState.streakState.freezes}
          </span>
        </div>
      </PixelPanel>

      {/* Active dungeon card */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <PixelHeader size={10}>🏰 CURRENT DUNGEON</PixelHeader>
          {dungeon1Cleared && (
            <button
              onClick={() => setShowSelect((v) => !v)}
              style={{
                fontFamily: "'Press Start 2P'",
                fontSize: 7,
                color: RPG.gold,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {showSelect ? 'CLOSE ▲' : 'CHANGE ▼'}
            </button>
          )}
        </div>
        <PixelPanel style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 32 }}>{activeDungeon.meta.sprite}</div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: 10,
                  color: RPG.text,
                  marginBottom: 4,
                }}
              >
                {activeDungeon.meta.name}
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: 8,
                  color: RPG.textDim,
                }}
              >
                {progress}/{totalMonsters} CLEARED
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
                width: `${(progress / totalMonsters) * 100}%`,
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

      {/* Dungeon select (shown after Dungeon 1 cleared) */}
      {showSelect && dungeon1Cleared && (
        <div>
          <PixelHeader size={10}>🗺 SELECT DUNGEON</PixelHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DUNGEONS.map((d) => {
              const unlocked = isDungeonUnlocked(d.meta.id, dungeonState.progress);
              const dProg = dungeonState.progress[d.meta.id];
              const dCleared = dProg?.cleared === true;
              const isActive = d.meta.id === dungeonState.activeDungeonId;
              return (
                <button
                  key={d.meta.id}
                  onClick={() => unlocked && handlePick(d.meta.id)}
                  disabled={!unlocked}
                  style={{
                    background: isActive ? RPG.panelDark : '#0f0f1e',
                    border: `2px solid ${isActive ? RPG.gold : RPG.border}`,
                    padding: '10px 12px',
                    cursor: unlocked ? 'pointer' : 'not-allowed',
                    opacity: unlocked ? 1 : 0.45,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 24 }}>{d.meta.sprite}</div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: "'Press Start 2P'",
                        fontSize: 9,
                        color: unlocked ? RPG.text : RPG.textDim,
                      }}
                    >
                      {d.meta.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Press Start 2P'",
                        fontSize: 7,
                        color: RPG.textDim,
                        marginTop: 4,
                      }}
                    >
                      {!unlocked
                        ? '🔒 LOCKED'
                        : dCleared
                          ? '✓ CLEARED'
                          : isActive
                            ? '★ ACTIVE'
                            : 'AVAILABLE'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
