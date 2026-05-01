import React from 'react';
import type { ScreenProps } from '../types';
import {
  RPG,
  PixelPanel,
  PixelHeader,
  PixelButton,
  StatBar,
  XPBar,
  StreakBadge,
  CharSprite,
} from '../components/rpg';

const classColors: Record<string, string> = {
  mage: '#9b5de5',
  warrior: '#c44b4b',
  rogue: '#4caf50',
  scholar: '#4a9edd',
};

const Home: React.FC<ScreenProps> = ({ hero, gameState, setScreen }) => {
  const { hp, maxHp, mp, maxMp, xp, maxXp, level, gold, streak, questProgress, partyMembers } =
    gameState;

  const quests = [
    {
      id: 'daily1',
      title: 'Morning Vocab',
      jp: '単語の練習',
      desc: 'Learn 10 new words',
      xpReward: 80,
      goldReward: 20,
      progress: questProgress.daily1 ?? 0,
      total: 10,
      type: 'daily',
      icon: '📖',
    },
    {
      id: 'daily2',
      title: 'Kanji Hunt',
      jp: '漢字の練習',
      desc: 'Identify 5 kanji',
      xpReward: 120,
      goldReward: 30,
      progress: questProgress.daily2 ?? 0,
      total: 5,
      type: 'daily',
      icon: '🀄',
    },
    {
      id: 'party1',
      title: 'Boss Battle',
      jp: 'ボス戦',
      desc: 'Defeat Grammar Dragon with your party',
      xpReward: 300,
      goldReward: 80,
      progress: questProgress.party1 ?? 0,
      total: 50,
      type: 'party',
      icon: '🐉',
    },
  ];

  const heroColor = classColors[hero.classType] ?? RPG.gold;

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Hero header */}
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
              boxShadow: `2px 2px 0 rgba(0,0,0,0.5)`,
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
          <StatBar label="MP" value={mp} max={maxMp} color={RPG.blue} icon="💧" />
        </div>
      </PixelPanel>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10 }}>
        <PixelPanel style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
          <StreakBadge days={streak} />
        </PixelPanel>
        <PixelPanel style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: 22, marginBottom: 4, filter: 'drop-shadow(0 0 6px #e6a81766)' }}>
            💰
          </div>
          <div style={{ fontFamily: "'Press Start 2P'", fontSize: 11, color: RPG.gold }}>
            {gold}
          </div>
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 7,
              color: RPG.textDim,
              marginTop: 2,
            }}
          >
            GOLD
          </div>
        </PixelPanel>
        <PixelPanel style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: 22, marginBottom: 4, filter: 'drop-shadow(0 0 6px #ffffff33)' }}>
            ⭐
          </div>
          <div style={{ fontFamily: "'Press Start 2P'", fontSize: 11, color: '#f0f080' }}>
            {level * 3 + 7}
          </div>
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 7,
              color: RPG.textDim,
              marginTop: 2,
            }}
          >
            DAYS
          </div>
        </PixelPanel>
      </div>

      {/* Daily quests */}
      <div>
        <PixelHeader size={10}>⚔ DAILY QUESTS</PixelHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {quests
            .filter((q) => q.type === 'daily')
            .map((q) => {
              const done = q.progress >= q.total;
              return (
                <PixelPanel key={q.id} dark style={{ padding: '12px 14px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 20 }}>{q.icon}</div>
                      <div>
                        <div
                          style={{
                            fontFamily: "'Press Start 2P'",
                            fontSize: 9,
                            color: done ? RPG.textDim : RPG.text,
                            marginBottom: 3,
                          }}
                        >
                          {done ? '✓ ' : ''}
                          {q.title}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Press Start 2P'",
                            fontSize: 7,
                            color: RPG.textDim,
                          }}
                        >
                          {q.jp}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 3,
                      }}
                    >
                      <div style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: RPG.gold }}>
                        +{q.xpReward} XP
                      </div>
                      <div
                        style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: '#f0c030' }}
                      >
                        +{q.goldReward}💰
                      </div>
                    </div>
                  </div>
                  {/* progress bar */}
                  <div
                    style={{
                      height: 10,
                      background: '#0a0a14',
                      border: `2px solid ${RPG.border}`,
                      overflow: 'hidden',
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        width: `${(q.progress / q.total) * 100}%`,
                        height: '100%',
                        background: done ? RPG.green : RPG.gold,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: RPG.textDim }}
                    >
                      {q.progress}/{q.total}
                    </span>
                    {!done && (
                      <PixelButton small onClick={() => setScreen('lesson')} variant="gold">
                        START ▶
                      </PixelButton>
                    )}
                    {done && (
                      <span
                        style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: RPG.green }}
                      >
                        COMPLETE ✓
                      </span>
                    )}
                  </div>
                </PixelPanel>
              );
            })}
        </div>
      </div>

      {/* Party quest */}
      <div>
        <PixelHeader size={10}>🐉 PARTY QUEST</PixelHeader>
        {quests
          .filter((q) => q.type === 'party')
          .map((q) => (
            <PixelPanel key={q.id} style={{ borderColor: '#8b2a2a', padding: '14px' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 32 }}>{q.icon}</div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Press Start 2P'",
                      fontSize: 10,
                      color: '#e05555',
                      marginBottom: 4,
                    }}
                  >
                    {q.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Courier Prime', monospace",
                      fontSize: 12,
                      color: RPG.textDim,
                      lineHeight: 1.5,
                    }}
                  >
                    {q.desc}
                  </div>
                </div>
              </div>
              {/* Party members */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {partyMembers.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        overflow: 'hidden',
                        border: `2px solid ${classColors[m.classType] ?? RPG.border}`,
                        background: RPG.panelDark,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CharSprite classType={m.classType} size={28} />
                    </div>
                    <div
                      style={{ fontFamily: "'Press Start 2P'", fontSize: 6, color: RPG.textDim }}
                    >
                      {m.name}
                    </div>
                  </div>
                ))}
                <div
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      overflow: 'hidden',
                      border: `2px solid ${heroColor}`,
                      background: RPG.panelDark,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CharSprite classType={hero.classType} size={28} />
                  </div>
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: 6, color: RPG.gold }}>
                    YOU
                  </div>
                </div>
              </div>
              {/* Boss HP bar */}
              <div style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: '#e05555' }}>
                    BOSS HP
                  </span>
                  <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: RPG.textDim }}>
                    {q.total - q.progress}/{q.total}
                  </span>
                </div>
                <div
                  style={{
                    height: 12,
                    background: '#0a0a14',
                    border: `2px solid #8b2a2a`,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${((q.total - q.progress) / q.total) * 100}%`,
                      height: '100%',
                      background: '#c44b4b',
                      transition: 'width 0.4s',
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: 7,
                  color: RPG.textDim,
                  textAlign: 'right',
                }}
              >
                +{q.xpReward} XP +{q.goldReward}💰 on defeat
              </div>
            </PixelPanel>
          ))}
      </div>
    </div>
  );
};

export default Home;
