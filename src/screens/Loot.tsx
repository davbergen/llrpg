import React, { useState } from 'react';
import type { ScreenProps, InventoryItem, ItemRarity } from '../types';
import {
  RPG,
  pixelBorderStyle,
  PixelPanel,
  PixelHeader,
  PixelButton,
  ItemIcon,
} from '../components/rpg';

const lootPool: InventoryItem[] = [
  {
    id: 'iron_sword',
    name: 'Iron Katana',
    type: 'sword',
    rarity: 'common',
    jp: '鉄の刀',
    desc: '+5 ATK. The blade of a diligent student.',
    bonus: 'ATK +5',
  },
  {
    id: 'vocab_scroll',
    name: 'Vocab Scroll',
    type: 'scroll',
    rarity: 'common',
    jp: '語彙の巻物',
    desc: 'Unlock 3 bonus vocab words today.',
    bonus: 'Vocab +3',
  },
  {
    id: 'mana_potion',
    name: 'Mana Elixir',
    type: 'potion',
    rarity: 'uncommon',
    jp: 'マナ薬',
    desc: 'Restores 40 MP. Tastes like matcha.',
    bonus: 'MP +40',
  },
  {
    id: 'kanji_gem',
    name: 'Kanji Crystal',
    type: 'gem',
    rarity: 'rare',
    jp: '漢字の宝石',
    desc: 'A rare gem that glows with ancient meaning.',
    bonus: 'XP x1.5',
  },
  {
    id: 'ward_shield',
    name: "Scholar's Ward",
    type: 'shield',
    rarity: 'uncommon',
    jp: '盾',
    desc: '+8 DEF. Wards off forgotten vocab.',
    bonus: 'DEF +8',
  },
  {
    id: 'swift_bow',
    name: 'Swift Bow',
    type: 'bow',
    rarity: 'uncommon',
    jp: '速弓',
    desc: 'Earn gold faster on timed questions.',
    bonus: 'Gold +15%',
  },
];

const rarityColors: Record<ItemRarity, { color: string; glow: string; label: string }> = {
  common: { color: '#aaaaaa', glow: '#aaaaaa44', label: 'COMMON' },
  uncommon: { color: '#4caf50', glow: '#4caf5044', label: 'UNCOMMON' },
  rare: { color: '#4a9edd', glow: '#4a9edd88', label: 'RARE' },
  epic: { color: '#9b5de5', glow: '#9b5de588', label: 'EPIC' },
};

type Phase = 'chest' | 'reveal' | 'done';

const Loot: React.FC<ScreenProps> = ({ setGameState, setScreen }) => {
  const [revealed, setRevealed] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('chest');
  const [animating, setAnimating] = useState(false);

  const [lootItems] = useState<InventoryItem[]>(() => {
    const shuffled = [...lootPool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  });

  const openChest = () => {
    if (animating) return;
    setAnimating(true);
    setPhase('reveal');
    lootItems.forEach((_, i) => {
      setTimeout(
        () => {
          setRevealed((r) => [...r, i]);
          if (i === lootItems.length - 1) {
            setAnimating(false);
            setPhase('done');
          }
        },
        400 + i * 600,
      );
    });
  };

  const claimAll = () => {
    setGameState((gs) => ({
      ...gs,
      inventory: [...gs.inventory, ...lootItems],
      gold: gs.gold + 15,
    }));
    setScreen('home');
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px',
        gap: 16,
        background: `radial-gradient(ellipse at center, #1e1a3a 0%, ${RPG.bg} 70%)`,
        alignItems: 'center',
      }}
    >
      <style>{`
        @keyframes chestShake {
          0%,100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-5deg) scale(1.05); }
          75% { transform: rotate(5deg) scale(1.05); }
        }
        @keyframes itemReveal {
          from { transform: translateY(20px) scale(0.7); opacity: 0; }
          to   { transform: translateY(0)    scale(1);   opacity: 1; }
        }
        @keyframes rarityGlow {
          0%, 100% { box-shadow: 0 0 12px var(--glow); }
          50%       { box-shadow: 0 0 28px var(--glow); }
        }
        @keyframes shimmer {
          from { background-position: -200% center; }
          to   { background-position: 200% center; }
        }
      `}</style>

      <PixelHeader size={13} color={RPG.gold}>
        ⚔ LOOT DROP
      </PixelHeader>

      {phase === 'chest' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: "'Press Start 2P'",
                fontSize: 9,
                color: RPG.textDim,
                marginBottom: 8,
              }}
            >
              QUEST REWARDS AWAIT!
            </div>
            <div
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: 13,
                color: RPG.textDim,
                lineHeight: 1.6,
              }}
            >
              You earned loot for completing today's lessons. Open the chest to discover your
              rewards!
            </div>
          </div>

          <div
            onClick={openChest}
            style={{
              cursor: 'pointer',
              animation: 'chestShake 2s ease-in-out infinite',
              filter: `drop-shadow(0 0 20px ${RPG.gold}88)`,
            }}
          >
            <div
              style={{
                width: 100,
                height: 90,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 100,
                  height: 40,
                  background: '#8b5e0a',
                  border: `3px solid ${RPG.gold}`,
                  borderBottom: 'none',
                  position: 'relative',
                  boxShadow: `0 0 15px ${RPG.gold}44`,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    right: 8,
                    height: 6,
                    background: RPG.gold,
                    opacity: 0.4,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 20,
                    height: 12,
                    background: RPG.gold,
                    border: `2px solid #7a4e08`,
                  }}
                />
              </div>
              <div
                style={{
                  width: 100,
                  height: 50,
                  background: '#7a4e08',
                  border: `3px solid ${RPG.gold}`,
                  borderTop: 'none',
                  boxShadow: `0 4px 0 #4a2e04`,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    left: 8,
                    right: 8,
                    height: 6,
                    background: RPG.gold,
                    opacity: 0.3,
                  }}
                />
              </div>
            </div>
          </div>

          <PixelButton onClick={openChest} variant="gold" style={{ minWidth: 200 }}>
            ✦ OPEN CHEST ✦
          </PixelButton>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: RPG.gold }}>
              +15 💰
            </div>
            <div style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: RPG.textDim }}>
              GOLD BONUS
            </div>
          </div>
        </div>
      )}

      {(phase === 'reveal' || phase === 'done') && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lootItems.map((item, i) => {
            const rc = rarityColors[item.rarity];
            const isRevealed = revealed.includes(i);
            return (
              <div
                key={item.id}
                style={
                  {
                    animation: isRevealed ? 'itemReveal 0.4s ease forwards' : 'none',
                    opacity: isRevealed ? 1 : 0,
                    ['--glow' as string]: rc.glow,
                  } as React.CSSProperties
                }
              >
                <div
                  style={{
                    ...pixelBorderStyle(rc.color, RPG.panel),
                    padding: '14px 16px',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'center',
                    boxShadow: `${pixelBorderStyle(rc.color).boxShadow}, 0 0 16px ${rc.glow}`,
                  }}
                >
                  <ItemIcon type={item.type} size={48} />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}
                    >
                      <div
                        style={{ fontFamily: "'Press Start 2P'", fontSize: 10, color: RPG.text }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Press Start 2P'",
                          fontSize: 7,
                          color: rc.color,
                          padding: '3px 6px',
                          border: `1px solid ${rc.color}`,
                          background: `${rc.color}22`,
                        }}
                      >
                        {rc.label}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "'Press Start 2P'",
                        fontSize: 8,
                        color: RPG.textDim,
                        marginBottom: 6,
                      }}
                    >
                      {item.jp}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Courier Prime', monospace",
                        fontSize: 12,
                        color: RPG.textDim,
                        lineHeight: 1.5,
                        marginBottom: 6,
                      }}
                    >
                      {item.desc}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Press Start 2P'",
                        fontSize: 8,
                        color: RPG.green,
                        display: 'inline-block',
                        padding: '3px 8px',
                        background: '#0a2a0a',
                        border: `1px solid ${RPG.green}`,
                      }}
                    >
                      {item.bonus}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {phase === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <PixelPanel dark style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: RPG.gold }}>
                  +3 NEW ITEMS ADDED TO INVENTORY
                </div>
                <div
                  style={{
                    fontFamily: "'Press Start 2P'",
                    fontSize: 8,
                    color: '#f0c030',
                    marginTop: 6,
                  }}
                >
                  +15 GOLD EARNED
                </div>
              </PixelPanel>
              <PixelButton onClick={claimAll} variant="green" style={{ width: '100%' }}>
                ✦ CLAIM ALL & CONTINUE
              </PixelButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Loot;
