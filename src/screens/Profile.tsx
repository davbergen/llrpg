import React, { useState } from 'react';
import type { ScreenProps, ClassType, InventoryItem, ItemRarity } from '../types';
import {
  RPG,
  pixelBorderStyle,
  PixelPanel,
  PixelHeader,
  XPBar,
  CharSprite,
  ItemIcon,
} from '../components/rpg';

const classColors: Record<ClassType, string> = {
  mage: '#9b5de5',
  warrior: '#c44b4b',
  rogue: '#4caf50',
  scholar: '#4a9edd',
};

const classAbilities: Record<ClassType, string[]> = {
  mage: ['Arcane Grammar', 'Spell Weave', 'Kanji Mastery'],
  warrior: ['Iron Vocab', 'Battle Cry', 'Endurance'],
  rogue: ['Quick Strike', 'Shadow Step', 'Gold Rush'],
  scholar: ['Deep Study', 'Book Lore', 'Focus'],
};

const rarityColors: Record<ItemRarity, string> = {
  common: '#aaaaaa',
  uncommon: '#4caf50',
  rare: '#4a9edd',
  epic: '#9b5de5',
};

const defaultInventory: InventoryItem[] = [
  {
    id: 'starter_sword',
    name: 'Wooden Bokken',
    type: 'sword',
    rarity: 'common',
    jp: '木刀',
    bonus: 'ATK +2',
  },
  {
    id: 'starter_scroll',
    name: 'Beginner Scroll',
    type: 'scroll',
    rarity: 'common',
    jp: '入門書',
    bonus: 'XP +5%',
  },
];

type Tab = 'stats' | 'inventory' | 'achievements';

const Profile: React.FC<ScreenProps> = ({ hero, gameState }) => {
  const [tab, setTab] = useState<Tab>('stats');

  const heroColor = classColors[hero.classType] ?? RPG.gold;
  const abilities = classAbilities[hero.classType] ?? classAbilities.mage;

  const achievements = [
    {
      id: 'first_lesson',
      icon: '📖',
      title: 'First Steps',
      desc: 'Complete your first lesson',
      unlocked: true,
    },
    {
      id: 'streak_7',
      icon: '🔥',
      title: 'Week Warrior',
      desc: '7-day streak',
      unlocked: gameState.streak >= 7,
    },
    {
      id: 'streak_30',
      icon: '🌟',
      title: 'Monthly Master',
      desc: '30-day streak',
      unlocked: gameState.streak >= 30,
    },
    {
      id: 'gold_100',
      icon: '💰',
      title: 'Treasure Hunter',
      desc: 'Earn 100 gold',
      unlocked: gameState.gold >= 100,
    },
    {
      id: 'level_5',
      icon: '⚔',
      title: 'Seasoned Hero',
      desc: 'Reach level 5',
      unlocked: gameState.level >= 5,
    },
    {
      id: 'perfect',
      icon: '✨',
      title: 'Flawless',
      desc: 'Perfect score on a lesson',
      unlocked: false,
    },
    { id: 'party', icon: '🤝', title: 'Team Player', desc: 'Join a party quest', unlocked: true },
    {
      id: 'vocab_50',
      icon: '📚',
      title: 'Lexicon',
      desc: 'Learn 50 vocabulary words',
      unlocked: false,
    },
  ];

  const inventory: InventoryItem[] =
    gameState.inventory.length > 0 ? gameState.inventory : defaultInventory;

  const stats: Array<{ label: string; value: string | number; icon: string }> = [
    {
      label: 'Total XP',
      value: gameState.xp + (gameState.level - 1) * gameState.maxXp,
      icon: '⭐',
    },
    { label: 'Lessons Done', value: 12, icon: '📖' },
    { label: 'Words Learned', value: 47, icon: '🗒' },
    { label: 'Kanji Known', value: 18, icon: '🀄' },
    { label: 'Accuracy', value: '84%', icon: '🎯' },
    { label: 'Best Streak', value: `${gameState.streak} days`, icon: '🔥' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div
        style={{
          background: `linear-gradient(180deg, ${heroColor}22 0%, transparent 100%)`,
          borderBottom: `3px solid ${RPG.border}`,
          padding: '20px 16px 16px',
          display: 'flex',
          gap: 14,
          alignItems: 'flex-end',
        }}
      >
        <div style={{ position: 'relative' }}>
          <div
            style={{
              border: `3px solid ${heroColor}`,
              boxShadow: `0 0 20px ${heroColor}66`,
              background: RPG.panelDark,
              padding: 8,
            }}
          >
            <CharSprite classType={hero.classType} size={72} />
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: -6,
              right: -6,
              background: heroColor,
              border: `2px solid ${RPG.bg}`,
              fontFamily: "'Press Start 2P'",
              fontSize: 9,
              color: '#fff',
              padding: '3px 7px',
              boxShadow: `2px 2px 0 rgba(0,0,0,0.5)`,
            }}
          >
            LV{gameState.level}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 14,
              color: RPG.gold,
              marginBottom: 4,
              lineHeight: 1.4,
            }}
          >
            {hero.name}
          </div>
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 9,
              color: heroColor,
              marginBottom: 10,
              textTransform: 'uppercase',
            }}
          >
            {hero.classType} CLASS
          </div>
          <XPBar xp={gameState.xp} maxXp={gameState.maxXp} level={gameState.level} />
          <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
            <span style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: '#f0c030' }}>
              💰 {gameState.gold}
            </span>
            <span style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: '#ff9a3c' }}>
              🔥 {gameState.streak}
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: `2px solid ${RPG.border}22` }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {abilities.map((ab, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: '8px 6px',
                textAlign: 'center',
                background: RPG.panelDark,
                border: `2px solid ${i === 0 ? heroColor : RPG.border}`,
                boxShadow: i === 0 ? `0 0 10px ${heroColor}44` : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: 6,
                  color: i === 0 ? heroColor : RPG.textDim,
                  lineHeight: 1.5,
                }}
              >
                {ab}
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: 6,
                  color: i === 0 ? RPG.gold : RPG.textDark,
                  marginTop: 3,
                }}
              >
                {i === 0 ? 'ACTIVE' : `LV${(i + 1) * 5}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: `3px solid ${RPG.border}` }}>
        {(['stats', 'inventory', 'achievements'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '10px 4px',
              background: tab === t ? RPG.panel : 'transparent',
              border: 'none',
              borderBottom: tab === t ? `3px solid ${RPG.gold}` : '3px solid transparent',
              fontFamily: "'Press Start 2P'",
              fontSize: 7,
              color: tab === t ? RPG.gold : RPG.textDim,
              cursor: 'pointer',
              letterSpacing: 0.5,
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {tab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {stats.map((s, i) => (
                <PixelPanel key={i} dark style={{ padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                  <div
                    style={{
                      fontFamily: "'Press Start 2P'",
                      fontSize: 11,
                      color: RPG.text,
                      marginBottom: 4,
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: 6, color: RPG.textDim }}>
                    {s.label}
                  </div>
                </PixelPanel>
              ))}
            </div>
            <PixelPanel style={{ marginTop: 4 }}>
              <PixelHeader size={9}>STUDY HISTORY</PixelHeader>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {Array.from({ length: 28 }).map((_, i) => {
                  const active = Math.random() > 0.35;
                  const intensity = active ? (Math.random() > 0.6 ? 1 : 0.5) : 0;
                  return (
                    <div
                      key={i}
                      style={{
                        width: 14,
                        height: 14,
                        background:
                          intensity === 1 ? RPG.green : intensity === 0.5 ? '#2a6a30' : '#1a2a1a',
                        border: `1px solid ${RPG.border}22`,
                      }}
                      title={`Day ${i + 1}`}
                    />
                  );
                })}
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: 6,
                  color: RPG.textDim,
                  marginTop: 8,
                }}
              >
                LAST 28 DAYS
              </div>
            </PixelPanel>
          </div>
        )}

        {tab === 'inventory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inventory.length === 0 && (
              <div style={{ textAlign: 'center', padding: 30 }}>
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: RPG.textDim }}>
                  INVENTORY EMPTY
                </div>
                <div
                  style={{
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: 12,
                    color: RPG.textDark,
                    marginTop: 8,
                  }}
                >
                  Complete quests to earn loot!
                </div>
              </div>
            )}
            {inventory.map((item, i) => (
              <div
                key={i}
                style={{
                  ...pixelBorderStyle(rarityColors[item.rarity] ?? RPG.border, RPG.panelDark),
                  padding: '10px 12px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <ItemIcon type={item.type} size={40} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "'Press Start 2P'",
                      fontSize: 9,
                      color: RPG.text,
                      marginBottom: 3,
                    }}
                  >
                    {item.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Press Start 2P'",
                      fontSize: 7,
                      color: RPG.textDim,
                      marginBottom: 5,
                    }}
                  >
                    {item.jp}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Press Start 2P'",
                      fontSize: 7,
                      color: RPG.green,
                      padding: '2px 6px',
                      background: '#0a2a0a',
                      border: `1px solid ${RPG.green}`,
                      display: 'inline-block',
                    }}
                  >
                    {item.bonus}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "'Press Start 2P'",
                    fontSize: 6,
                    color: rarityColors[item.rarity] ?? RPG.textDim,
                    padding: '2px 5px',
                    border: `1px solid ${rarityColors[item.rarity] ?? RPG.border}`,
                    background: `${rarityColors[item.rarity] ?? RPG.border}22`,
                  }}
                >
                  {item.rarity.toUpperCase()}
                </div>
              </div>
            ))}
            <div
              style={{
                fontFamily: "'Press Start 2P'",
                fontSize: 7,
                color: RPG.textDim,
                textAlign: 'center',
                marginTop: 4,
              }}
            >
              {inventory.length} / 20 ITEMS
            </div>
          </div>
        )}

        {tab === 'achievements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                fontFamily: "'Press Start 2P'",
                fontSize: 8,
                color: RPG.textDim,
                marginBottom: 4,
              }}
            >
              {achievements.filter((a) => a.unlocked).length}/{achievements.length} UNLOCKED
            </div>
            {achievements.map((ach) => (
              <div
                key={ach.id}
                style={{
                  ...pixelBorderStyle(
                    ach.unlocked ? RPG.gold : RPG.border,
                    ach.unlocked ? '#1a1400' : RPG.panelDark,
                  ),
                  padding: '12px 14px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  opacity: ach.unlocked ? 1 : 0.5,
                }}
              >
                <div
                  style={{
                    fontSize: 24,
                    filter: ach.unlocked ? `drop-shadow(0 0 6px ${RPG.gold}88)` : 'grayscale(1)',
                  }}
                >
                  {ach.unlocked ? ach.icon : '🔒'}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "'Press Start 2P'",
                      fontSize: 9,
                      color: ach.unlocked ? RPG.gold : RPG.textDim,
                      marginBottom: 4,
                    }}
                  >
                    {ach.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Courier Prime', monospace",
                      fontSize: 11,
                      color: RPG.textDim,
                    }}
                  >
                    {ach.desc}
                  </div>
                </div>
                {ach.unlocked && (
                  <div style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: RPG.green }}>
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
