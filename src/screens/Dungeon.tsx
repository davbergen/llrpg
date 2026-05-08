import React from 'react';
import type { ScreenProps } from '../types';
import { DUNGEON_MONSTERS, DUNGEON_NAME } from '../game/dungeon';
import { resolveMana, canAffordAbility, initialManaState, MANA_MAX } from '../game/mana';
import {
  unlockedAbilities,
  secondaryResourceForClass,
  type ClassAbility,
} from '../game/class-abilities';
import {
  RAGE_MAX,
  FAITH_MAX,
  emptySecondaryResources,
  canAffordSecondary,
} from '../game/secondary-resources';
import { RPG, PixelPanel, PixelHeader, PixelButton, pixelBorderStyle } from '../components/rpg';

interface DungeonProps extends ScreenProps {
  onAbilityChosen?: (abilityId: string) => void;
}

function tierColor(ab: ClassAbility): string {
  if (ab.mpCost <= 1) return RPG.green;
  if (ab.mpCost <= 3) return RPG.gold;
  return RPG.red;
}

const Dungeon: React.FC<DungeonProps> = ({ gameState, hero, setScreen, onAbilityChosen }) => {
  const { dungeonState } = gameState;
  const mana = resolveMana(gameState.mana ?? initialManaState(Date.now()), Date.now());
  const secondary = gameState.secondaryResources ?? emptySecondaryResources();
  const playerHpPct = Math.max(0, (gameState.hp / gameState.maxHp) * 100);
  const monster = DUNGEON_MONSTERS[dungeonState.currentMonsterIndex];
  const cleared = dungeonState.currentMonsterIndex >= DUNGEON_MONSTERS.length;
  const abilities = unlockedAbilities(hero.classType, gameState.level);
  const outOfMana = abilities.every((ab) => !canAffordAbility(mana, ab.mpCost));
  const secondaryKind = secondaryResourceForClass(hero.classType);

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
  const manaPct = Math.max(0, (mana.current / MANA_MAX) * 100);
  const secondaryValue =
    secondaryKind === 'rage' ? secondary.rage : secondaryKind === 'faith' ? secondary.faith : 0;
  const secondaryMax = secondaryKind === 'rage' ? RAGE_MAX : FAITH_MAX;
  const secondaryPct = secondaryKind ? (secondaryValue / secondaryMax) * 100 : 0;
  const secondaryColor = secondaryKind === 'rage' ? '#c44b4b' : '#f4e060';
  const secondaryLabel = secondaryKind === 'rage' ? 'RAGE' : secondaryKind === 'faith' ? 'FAITH' : '';

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
            marginBottom: 8,
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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: '#6699cc' }}>
            MANA
          </span>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: RPG.textDim }}>
            {mana.current}/{MANA_MAX}
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
              width: `${manaPct}%`,
              height: '100%',
              background: '#6699cc',
              transition: 'width 0.4s',
            }}
          />
        </div>
        {secondaryKind && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 8,
                marginBottom: 4,
              }}
            >
              <span
                style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: secondaryColor }}
              >
                {secondaryLabel}
              </span>
              <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: RPG.textDim }}>
                {secondaryValue}/{secondaryMax}
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
                  width: `${secondaryPct}%`,
                  height: '100%',
                  background: secondaryColor,
                  transition: 'width 0.4s',
                }}
              />
            </div>
          </>
        )}
        {dungeonState.pendingDamageMultiplier && dungeonState.pendingDamageMultiplier > 1 && (
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 7,
              color: RPG.gold,
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            ✦ {dungeonState.pendingDamageMultiplier.toFixed(1)}× NEXT HIT
          </div>
        )}
      </PixelPanel>

      <PixelHeader size={10}>⚔ CHOOSE ABILITY</PixelHeader>
      {outOfMana && (
        <PixelPanel dark style={{ textAlign: 'center', padding: '10px 12px' }}>
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 8,
              color: RPG.gold,
              lineHeight: 1.6,
            }}
          >
            💧 OUT OF MANA
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
            RESETS AT 4AM
          </div>
        </PixelPanel>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {abilities.map((ab) => {
          const manaOk = canAffordAbility(mana, ab.mpCost);
          const secOk = canAffordSecondary(secondary, ab.classType, ab.secondaryCost);
          const affordable = manaOk && secOk;
          const color = tierColor(ab);
          return (
            <button
              key={ab.id}
              onClick={() => onAbilityChosen?.(ab.id)}
              disabled={!affordable}
              style={{
                ...pixelBorderStyle(color, RPG.panelDark),
                padding: '12px 14px',
                cursor: affordable ? 'pointer' : 'not-allowed',
                opacity: affordable ? 1 : 0.4,
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
                  {ab.lessonQuestions}q · {ab.mpCost} MP
                  {ab.secondaryCost ? ` · -${ab.secondaryCost} ${secondaryLabel}` : ''}
                  {ab.secondaryGain ? ` · +${ab.secondaryGain} ${secondaryLabel}` : ''}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: 11,
                  color: RPG.gold,
                }}
              >
                {ab.baseDamage > 0 ? (
                  <>
                    {ab.baseDamage}
                    <span style={{ fontSize: 7, color: RPG.textDim, marginLeft: 4 }}>DMG</span>
                  </>
                ) : (
                  <span style={{ fontSize: 8, color: secondaryColor }}>SUPPORT</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Dungeon;
