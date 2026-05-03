import React, { useEffect, useState } from 'react';
import type { InventoryItem, ItemRarity, ScreenProps } from '../types';
import {
  RPG,
  pixelBorderStyle,
  PixelPanel,
  PixelHeader,
  PixelButton,
  ItemIcon,
} from '../components/rpg';

export interface LootReward {
  monsterName: string;
  xp: number;
  gold: number;
  items: InventoryItem[];
  leveledUp: boolean;
  newLevel: number;
  dungeonCleared: boolean;
}

interface LootProps extends ScreenProps {
  reward?: LootReward | null;
  onContinue?: () => void;
}

const rarityColors: Record<ItemRarity, { color: string; glow: string; label: string }> = {
  common: { color: '#aaaaaa', glow: '#aaaaaa44', label: 'COMMON' },
  uncommon: { color: '#4caf50', glow: '#4caf5044', label: 'UNCOMMON' },
  rare: { color: '#4a9edd', glow: '#4a9edd88', label: 'RARE' },
  epic: { color: '#9b5de5', glow: '#9b5de588', label: 'EPIC' },
};

const Loot: React.FC<LootProps> = ({ reward, onContinue, setScreen }) => {
  const [showLevelOverlay, setShowLevelOverlay] = useState(false);

  useEffect(() => {
    if (!reward?.leveledUp) return;
    setShowLevelOverlay(true);
    const t = setTimeout(() => setShowLevelOverlay(false), 1800);
    return () => clearTimeout(t);
  }, [reward?.leveledUp, reward?.newLevel]);

  if (!reward) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 16px',
          gap: 16,
        }}
      >
        <PixelHeader size={12} color={RPG.gold}>
          NO LOOT YET
        </PixelHeader>
        <div
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 13,
            color: RPG.textDim,
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: 280,
          }}
        >
          Defeat a monster in the dungeon to claim rewards.
        </div>
        <PixelButton onClick={() => setScreen('dungeon')} variant="green" style={{ minWidth: 200 }}>
          ⚔ TO DUNGEON
        </PixelButton>
      </div>
    );
  }

  const continueLabel = reward.dungeonCleared ? '🏠 RETURN HOME' : '▶ NEXT MONSTER';

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px',
        gap: 14,
        background: `radial-gradient(ellipse at center, #1e1a3a 0%, ${RPG.bg} 70%)`,
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes itemReveal {
          from { transform: translateY(20px) scale(0.7); opacity: 0; }
          to   { transform: translateY(0)    scale(1);   opacity: 1; }
        }
        @keyframes levelOverlayBackdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes levelOverlayContent {
          0%   { opacity: 0; transform: scale(0.6); }
          40%  { opacity: 1; transform: scale(1.1); }
          70%  { transform: scale(1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes levelOverlayFade {
          to { opacity: 0; }
        }
        @keyframes levelStarPulse {
          0%, 100% { text-shadow: 0 0 8px ${RPG.gold}, 0 0 24px ${RPG.gold}88; }
          50%      { text-shadow: 0 0 20px ${RPG.gold}, 0 0 48px ${RPG.gold}; }
        }
      `}</style>

      {showLevelOverlay && reward.leveledUp && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, #2a1f00cc 0%, #000000ee 80%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            animation:
              'levelOverlayBackdrop 0.25s ease forwards, levelOverlayFade 0.4s ease 1.4s forwards',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              animation: 'levelOverlayContent 0.5s ease forwards',
              transformOrigin: 'center center',
            }}
          >
            <div
              style={{
                fontFamily: "'Press Start 2P'",
                fontSize: 22,
                color: RPG.gold,
                animation: 'levelStarPulse 0.8s ease-in-out infinite',
                textAlign: 'center',
              }}
            >
              ✦ LEVEL UP! ✦
            </div>
            <div
              style={{
                fontFamily: "'Press Start 2P'",
                fontSize: 14,
                color: RPG.text,
              }}
            >
              LEVEL {reward.newLevel}
            </div>
            <div
              style={{
                fontFamily: "'Press Start 2P'",
                fontSize: 8,
                color: RPG.textDim,
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              +10 MAX HP
              <br />
              FULLY HEALED
            </div>
          </div>
        </div>
      )}

      <PixelHeader size={13} color={RPG.gold}>
        ⚔ VICTORY!
      </PixelHeader>

      <div
        style={{
          fontFamily: "'Press Start 2P'",
          fontSize: 9,
          color: RPG.textDim,
          textAlign: 'center',
        }}
      >
        DEFEATED: {reward.monsterName.toUpperCase()}
      </div>

      {reward.leveledUp && (
        <PixelPanel
          gold
          style={{
            textAlign: 'center',
            width: '100%',
            animation: 'itemReveal 0.4s ease',
          }}
        >
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 14,
              color: RPG.gold,
              textShadow: `0 0 16px ${RPG.gold}88`,
              marginBottom: 6,
            }}
          >
            ✦ LEVEL UP! ✦
          </div>
          <div style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: RPG.text }}>
            NOW LEVEL {reward.newLevel}
          </div>
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 7,
              color: RPG.textDim,
              marginTop: 6,
            }}
          >
            +10 MAX HP · FULL HEAL
          </div>
        </PixelPanel>
      )}

      <PixelPanel gold style={{ width: '100%' }}>
        <PixelHeader size={10}>REWARDS</PixelHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <RewardRow label="XP" value={`+${reward.xp}`} color={RPG.gold} />
          <RewardRow
            label="Gold"
            value={`+${reward.gold} 💰`}
            color={reward.gold > 0 ? '#f0c030' : RPG.textDim}
          />
        </div>
      </PixelPanel>

      {reward.items.length > 0 ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reward.items.map((item, i) => {
            const rc = rarityColors[item.rarity];
            return (
              <div
                key={`${item.id}-${i}`}
                style={
                  {
                    animation: 'itemReveal 0.4s ease',
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
                    {item.desc && (
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
                    )}
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
        </div>
      ) : (
        <PixelPanel dark style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: RPG.textDim }}>
            NO ITEM DROP THIS TIME
          </div>
        </PixelPanel>
      )}

      <PixelButton
        onClick={() => (onContinue ? onContinue() : setScreen('dungeon'))}
        variant="green"
        style={{ width: '100%', marginTop: 'auto' }}
      >
        {continueLabel}
      </PixelButton>
    </div>
  );
};

const RewardRow: React.FC<{ label: string; value: string; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: RPG.text }}>{label}</span>
    <span style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color }}>{value}</span>
  </div>
);

export default Loot;
