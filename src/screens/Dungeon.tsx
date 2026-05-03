import React from 'react';
import type { AbilityTier, ScreenProps } from '../types';
import { ABILITIES, DUNGEON_MONSTERS, DUNGEON_NAME } from '../game/dungeon';
import { canUseAbility } from '../game/daily-cap';
import { RPG, PixelPanel, PixelHeader, PixelButton, pixelBorderStyle } from '../components/rpg';

const tierColor: Record<string, string> = {
  weak: RPG.green,
  medium: RPG.gold,
  strong: RPG.red,
};

interface DungeonProps extends ScreenProps {
  onAbilityChosen?: (tier: AbilityTier) => void;
}

const Dungeon: React.FC<DungeonProps> = ({ gameState, hero, setScreen, onAbilityChosen }) => {
  const { dungeonState } = gameState;
  const playerHpPct = Math.max(0, (gameState.hp / gameState.maxHp) * 100);
  const monster = DUNGEON_MONSTERS[dungeonState.currentMonsterIndex];
  const cleared = dungeonState.currentMonsterIndex >= DUNGEON_MONSTERS.length;

  if (cleared) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 14,
          gap: 14,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PixelHeader size={14}>DUNGEON CLEARED</PixelHeader>
        <PixelPanel gold style={{ textAlign: 'center', width: '100%' }}>
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 10,
              color: RPG.gold,
              lineHeight: 1.6,
            }}
          >
            {DUNGEON_NAME}
          </div>
        </PixelPanel>
        <PixelButton onClick={() => setScreen('home')} style={{ width: '100%' }}>
          ◀ RETURN HOME
        </PixelButton>
      </div>
    );
  }

  const hpPct = Math.max(0, (dungeonState.currentMonsterHp / monster.maxHp) * 100);
  const canAttack = canUseAbility(Date.now(), dungeonState.lastAbilityUsedAt);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <PixelHeader size={11}>{DUNGEON_NAME.toUpperCase()}</PixelHeader>
        <span style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: RPG.textDim }}>
          {dungeonState.currentMonsterIndex}/{DUNGEON_MONSTERS.length}
        </span>
      </div>

      <PixelPanel
        gold={monster.isBoss}
        style={{ textAlign: 'center', padding: '24px 12px' }}
      >
        <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 12 }}>{monster.emoji}</div>
        <div
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: 11,
            color: monster.isBoss ? RPG.red : RPG.text,
            marginBottom: 4,
            textShadow: monster.isBoss ? `0 0 8px ${RPG.red}66` : 'none',
          }}
        >
          {monster.isBoss ? '✦ ' : ''}
          {monster.name}
          {monster.isBoss ? ' ✦' : ''}
        </div>
        <div
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: 7,
            color: RPG.textDim,
            marginBottom: 10,
          }}
        >
          {monster.isBoss ? 'BOSS' : `MONSTER ${dungeonState.currentMonsterIndex + 1}`}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: RPG.red }}>HP</span>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: RPG.textDim }}>
            {dungeonState.currentMonsterHp}/{monster.maxHp}
          </span>
        </div>
        <div
          style={{
            height: 12,
            background: '#0a0a14',
            border: `2px solid ${monster.isBoss ? '#8b2a2a' : RPG.border}`,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${hpPct}%`,
              height: '100%',
              background: monster.isBoss ? '#c44b4b' : RPG.red,
              transition: 'width 0.4s',
            }}
          />
        </div>
      </PixelPanel>

      <PixelPanel dark style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: RPG.green }}>
            {hero.name.toUpperCase()} HP
          </span>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: RPG.textDim }}>
            {gameState.hp}/{gameState.maxHp}
          </span>
        </div>
        <div
          style={{
            height: 10,
            background: '#0a0a14',
            border: `2px solid ${RPG.border}`,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${playerHpPct}%`,
              height: '100%',
              background: RPG.green,
              transition: 'width 0.4s',
            }}
          />
        </div>
      </PixelPanel>

      <PixelHeader size={10}>⚔ CHOOSE ABILITY</PixelHeader>
      {!canAttack && (
        <PixelPanel dark style={{ textAlign: 'center', padding: '10px 12px' }}>
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 8,
              color: RPG.gold,
              lineHeight: 1.6,
            }}
          >
            DAILY CAP REACHED
          </div>
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 7,
              color: RPG.textDim,
              marginTop: 6,
              lineHeight: 1.6,
            }}
          >
            COME BACK TOMORROW
          </div>
        </PixelPanel>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ABILITIES.map((ab) => {
          const color = tierColor[ab.tier];
          return (
            <button
              key={ab.id}
              onClick={() => onAbilityChosen?.(ab.tier)}
              disabled={!canAttack}
              style={{
                ...pixelBorderStyle(color, RPG.panelDark),
                padding: '12px 14px',
                cursor: canAttack ? 'pointer' : 'not-allowed',
                opacity: canAttack ? 1 : 0.4,
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'Press Start 2P'",
                    fontSize: 10,
                    color,
                    marginBottom: 4,
                  }}
                >
                  {ab.label}
                </div>
                <div
                  style={{
                    fontFamily: "'Press Start 2P'",
                    fontSize: 7,
                    color: RPG.textDim,
                  }}
                >
                  {ab.lessonQuestions}q LESSON
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: 11,
                  color: RPG.gold,
                }}
              >
                {ab.baseDamage}
                <span style={{ fontSize: 7, color: RPG.textDim, marginLeft: 4 }}>DMG</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Dungeon;
