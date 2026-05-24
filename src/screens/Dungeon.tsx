import React, { useEffect, useState } from 'react';
import type { ScreenProps } from '../types';
import { getDungeon, freshProgress } from '../game/dungeon';
import { calculateDecay } from '../game/decay';
import { resolveMana, canAffordAbility, initialManaState, MANA_MAX } from '../game/mana';
import {
  unlockedAbilities,
  secondaryResourceForClass,
  findAbilityById,
  type ClassAbility,
  type AbilityEffect,
} from '../game/class-abilities';
import {
  RAGE_MAX,
  FAITH_MAX,
  emptySecondaryResources,
  canAffordSecondary,
} from '../game/secondary-resources';
import { RPG, PixelPanel, PixelHeader, PixelButton } from '../components/rpg';
import { PixelGrid } from '../components/rpg/PixelGrid';
import { tintedHeroBack, heroPalette } from '../art/sprites';

export interface PendingAnimation {
  abilityId: string;
  damage: number;
  counterDamage: number;
  killed: boolean;
}

interface DungeonProps extends ScreenProps {
  onAbilityChosen?: (abilityId: string) => void;
  debugMode?: boolean;
  pendingAnimation?: PendingAnimation | null;
  onAnimationComplete?: () => void;
}

type AnimationKind = 'melee' | 'projectile';

function projectileTint(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('fire')) return '#ff7a3a';
  if (l.includes('frost') || l.includes('ice')) return '#4a9edd';
  if (l.includes('arcane')) return '#9b5de5';
  return '#9b5de5';
}

function animationKindFor(ab: ClassAbility): AnimationKind {
  return effectIcon(ab) === 'sword' ? 'melee' : 'projectile';
}

const MELEE_IMPACT_MS = 250;
const MELEE_TOTAL_MS = 600;
const PROJECTILE_TRAVEL_MS = 400;
const PROJECTILE_TOTAL_MS = 600;
const REDUCED_TOTAL_MS = 100;
const REDUCED_IMPACT_MS = 50;

type EffectIcon = 'sword' | 'staff' | 'heart' | 'shield';

function effectIcon(ab: ClassAbility): EffectIcon {
  const has = (kind: AbilityEffect['kind']) => ab.effects.some((e) => e.kind === kind);
  if (has('self_heal')) return 'heart';
  if (has('counter_reduction')) return 'shield';
  if (ab.baseDamage > 0 && ab.effects.length > 0) return 'staff';
  return 'sword';
}

function iconGlyph(icon: EffectIcon): string {
  switch (icon) {
    case 'sword':
      return '⚔';
    case 'staff':
      return '✦';
    case 'heart':
      return '♥';
    case 'shield':
      return '🛡';
  }
}

function iconColor(icon: EffectIcon): string {
  switch (icon) {
    case 'sword':
      return RPG.gold;
    case 'staff':
      return RPG.purple;
    case 'heart':
      return RPG.red;
    case 'shield':
      return RPG.blue;
  }
}

const Dungeon: React.FC<DungeonProps> = ({
  gameState,
  hero,
  setGameState,
  setScreen,
  onAbilityChosen,
  debugMode = false,
  pendingAnimation = null,
  onAnimationComplete,
}) => {
  const { dungeonState } = gameState;
  const dungeon = getDungeon(dungeonState.activeDungeonId);
  const monsters = dungeon.monsters;
  const progress =
    dungeonState.progress[dungeonState.activeDungeonId] ?? freshProgress(monsters);
  const monster = monsters[progress.currentMonsterIndex];
  const cleared = progress.cleared || progress.currentMonsterIndex >= monsters.length;
  const [decayApplied, setDecayApplied] = useState<number>(0);
  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null);

  // Apply decay on entry, once per visit, before any combat. Also seed progress
  // for newly-active dungeons that haven't been entered yet.
  useEffect(() => {
    if (cleared || !monster) return;
    const regen = calculateDecay(
      {
        lastActionAt: progress.lastActionAt,
        currentHp: progress.currentMonsterHp,
        maxHp: monster.maxHp,
        isBoss: monster.isBoss,
      },
      Date.now(),
    );
    setGameState((prev) => {
      const dId = prev.dungeonState.activeDungeonId;
      const existing = prev.dungeonState.progress[dId];
      if (!existing) {
        return {
          ...prev,
          dungeonState: {
            ...prev.dungeonState,
            progress: {
              ...prev.dungeonState.progress,
              [dId]: freshProgress(monsters),
            },
          },
        };
      }
      if (regen <= 0) return prev;
      return {
        ...prev,
        dungeonState: {
          ...prev.dungeonState,
          progress: {
            ...prev.dungeonState.progress,
            [dId]: {
              ...existing,
              currentMonsterHp: Math.min(monster.maxHp, existing.currentMonsterHp + regen),
              lastActionAt: Date.now(),
            },
          },
        },
      };
    });
    if (regen > 0) setDecayApplied(regen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animation phase: 'travel' while hero is swinging / projectile is in flight,
  // 'impact' after the hit lands (flash + shake + damage number), null when idle.
  const [animPhase, setAnimPhase] = useState<'travel' | 'impact' | null>(null);
  const [animTick, setAnimTick] = useState(0);
  const animatingAbility =
    pendingAnimation ? findAbilityById(pendingAnimation.abilityId) ?? null : null;
  const animKind: AnimationKind | null = animatingAbility
    ? animationKindFor(animatingAbility)
    : null;
  const animTint = animatingAbility ? projectileTint(animatingAbility.label) : '#9b5de5';
  const isAnimating = pendingAnimation != null;

  useEffect(() => {
    if (!pendingAnimation) {
      setAnimPhase(null);
      return;
    }
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const impactAt = reduced
      ? REDUCED_IMPACT_MS
      : animKind === 'projectile'
        ? PROJECTILE_TRAVEL_MS
        : MELEE_IMPACT_MS;
    const totalAt = reduced
      ? REDUCED_TOTAL_MS
      : animKind === 'projectile'
        ? PROJECTILE_TOTAL_MS
        : MELEE_TOTAL_MS;
    setAnimPhase('travel');
    setAnimTick((t) => t + 1);
    const t1 = window.setTimeout(() => setAnimPhase('impact'), impactAt);
    const t2 = window.setTimeout(() => {
      setAnimPhase(null);
      onAnimationComplete?.();
    }, totalAt);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // animKind is derived from pendingAnimation; safe to depend on the trigger only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAnimation]);

  const mana = resolveMana(gameState.mana ?? initialManaState(Date.now()), Date.now());
  const secondary = gameState.secondaryResources ?? emptySecondaryResources();
  const abilities = unlockedAbilities(hero.classType, gameState.level);
  const outOfMana =
    !debugMode && abilities.every((ab) => !canAffordAbility(mana, ab.mpCost));
  const secondaryKind = secondaryResourceForClass(hero.classType);
  const palette = heroPalette(hero.classType);
  const heroSprite = tintedHeroBack(hero.classType);

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
          background: '#0d0618',
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
            {dungeon.meta.name}
          </div>
        </PixelPanel>
        <PixelButton onClick={() => setScreen('home')} style={{ width: '100%' }}>
          ◀ RETURN HOME
        </PixelButton>
      </div>
    );
  }

  const hpPct = Math.max(0, (progress.currentMonsterHp / monster.maxHp) * 100);
  const playerHpPct = Math.max(0, (gameState.hp / gameState.maxHp) * 100);
  const manaPct = Math.max(0, (mana.current / MANA_MAX) * 100);
  const secondaryValue =
    secondaryKind === 'rage' ? secondary.rage : secondaryKind === 'faith' ? secondary.faith : 0;
  const secondaryMax = secondaryKind === 'rage' ? RAGE_MAX : FAITH_MAX;
  const secondaryPct = secondaryKind ? (secondaryValue / secondaryMax) * 100 : 0;
  const secondaryColor = secondaryKind === 'rage' ? '#c44b4b' : '#f4e060';
  const secondaryLabel =
    secondaryKind === 'rage' ? 'RAGE' : secondaryKind === 'faith' ? 'FAITH' : '';
  const monsterGlow = monster.isBoss ? '#c44b4b' : '#9b5de5';

  const selectedAbility = abilities.find((a) => a.id === selectedAbilityId) ?? null;
  const selectedAffordable = selectedAbility
    ? (debugMode || canAffordAbility(mana, selectedAbility.mpCost)) &&
      canAffordSecondary(secondary, selectedAbility.classType, selectedAbility.secondaryCost) &&
      !isAnimating
    : false;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#0d0618',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Press Start 2P'",
      }}
    >
      <style>{`
        @keyframes fightBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes fightTwinkle { 0%,100%{opacity:0.2} 50%{opacity:0.7} }
        @keyframes fightSlideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes meleeLunge {
          0% { transform: translateX(0); }
          42% { transform: translateX(200px); }
          58% { transform: translateX(200px); }
          100% { transform: translateX(0); }
        }
        @keyframes projectileFly {
          from { transform: translate(0, 0) scale(1); opacity: 1; }
          to { transform: translate(var(--projectile-dx), var(--projectile-dy)) scale(0.9); opacity: 1; }
        }
        @keyframes impactFlash {
          0% { opacity: 0; }
          15% { opacity: 0.85; }
          100% { opacity: 0; }
        }
        @keyframes impactRing {
          0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
        }
        @keyframes monsterShake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(3px); }
        }
        @keyframes damageFloat {
          0% { transform: translate(-50%, 0); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(-50%, -40px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes meleeLunge { 0%,100% { transform: translateX(0); } }
          @keyframes projectileFly { from,to { transform: translate(0,0); opacity: 0.6; } }
          @keyframes impactRing { 0%,100% { opacity: 0; } }
          @keyframes monsterShake { 0%,100% { transform: translateX(0); } }
        }
      `}</style>

      {/* Background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 30%, #1a0a2e 0%, #0a0614 60%, #060410 100%)',
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent 0, transparent 47px, #ffffff06 47px, #ffffff06 48px),
            repeating-linear-gradient(90deg, transparent 0, transparent 47px, #ffffff06 47px, #ffffff06 48px)
          `,
        }}
      />

      {[...Array(12)].map((_unused, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${10 + ((i * 7.3) % 80)}%`,
            top: `${5 + ((i * 11.7) % 55)}%`,
            width: 3,
            height: 3,
            background: i % 3 === 0 ? '#9b5de5' : i % 3 === 1 ? '#4a9edd' : '#e6a817',
            opacity: 0.35,
            borderRadius: '50%',
            animation: `fightTwinkle ${2 + (i % 3)}s ease-in-out ${i * 0.3}s infinite`,
          }}
        />
      ))}

      {/* Dungeon header */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '10px 14px',
          borderBottom: '2px solid #2a1a3a',
          background: '#0a0614',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 9, color: RPG.gold }}>{dungeon.meta.name.toUpperCase()}</div>
        <div style={{ fontSize: 7, color: RPG.textDim }}>
          {progress.currentMonsterIndex + 1}/{monsters.length}
        </div>
      </div>

      {decayApplied > 0 && (
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '6px 10px',
            background: '#1a0a2e',
            borderBottom: `2px solid ${RPG.gold}`,
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 7, color: RPG.gold, lineHeight: 1.6 }}>
            ⏳ ENEMY RECOVERED (+{decayApplied} HP)
          </div>
        </div>
      )}

      {/* Battle field */}
      <div style={{ position: 'relative', flex: '0 0 260px', overflow: 'hidden' }}>
        {/* Floor line */}
        <div
          style={{
            position: 'absolute',
            top: 230,
            left: 0,
            right: 0,
            height: 2,
            background:
              'linear-gradient(90deg, transparent, #c8860a55, #c8860a88, #c8860a55, transparent)',
          }}
        />

        {/* Monster */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 30,
            filter: `drop-shadow(0 0 20px ${monsterGlow}aa)`,
            fontSize: 96,
            lineHeight: 1,
          }}
        >
          <div
            key={animPhase === 'impact' ? `shake-${animTick}` : 'idle'}
            style={{
              animation:
                animPhase === 'impact'
                  ? 'monsterShake 200ms steps(3, end)'
                  : 'fightBob 2.5s ease-in-out infinite',
            }}
          >
            {monster.emoji}
          </div>
        </div>

        {/* Monster HP panel */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: '#0a0614cc',
            border: `1px solid ${monster.isBoss ? RPG.red : RPG.border}`,
            padding: '5px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            zIndex: 1,
            maxWidth: 160,
          }}
        >
          <div
            style={{
              fontSize: 7,
              color: monster.isBoss ? RPG.red : RPG.text,
              textShadow: monster.isBoss ? `0 0 8px ${RPG.red}66` : 'none',
            }}
          >
            {monster.isBoss ? '✦ ' : ''}
            {monster.name}
            {monster.isBoss ? ' ✦' : ''}
          </div>
          <div
            style={{
              width: 130,
              height: 7,
              background: '#050510',
              border: `1px solid ${monster.isBoss ? RPG.red : RPG.border}`,
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
          <div style={{ fontSize: 6, color: RPG.textDim, textAlign: 'right' }}>
            {progress.currentMonsterHp}/{monster.maxHp}
          </div>
        </div>

        {/* Hero sprite */}
        <div
          style={{
            position: 'absolute',
            top: 130,
            left: 20,
            filter: `drop-shadow(0 0 16px ${palette.glow})`,
            animation:
              isAnimating && animKind === 'melee'
                ? `meleeLunge ${MELEE_TOTAL_MS}ms ease-out`
                : undefined,
          }}
        >
          <PixelGrid grid={heroSprite} scale={9} />
        </div>

        {/* Projectile orb (staff archetype) */}
        {isAnimating && animKind === 'projectile' && animPhase === 'travel' && (
          <div
            key={`proj-${animTick}`}
            style={{
              position: 'absolute',
              // Start near hero center, travel to monster center.
              top: 168,
              left: 70,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: animTint,
              boxShadow: `0 0 12px ${animTint}, 0 0 24px ${animTint}aa, inset 0 0 6px #ffffffaa`,
              ['--projectile-dx' as string]: '240px',
              ['--projectile-dy' as string]: '-60px',
              animation: `projectileFly ${PROJECTILE_TRAVEL_MS}ms linear forwards`,
              zIndex: 3,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Impact effects on monster */}
        {isAnimating && animPhase === 'impact' && (
          <>
            <div
              key={`flash-${animTick}`}
              style={{
                position: 'absolute',
                top: 60,
                right: 30,
                width: 96,
                height: 96,
                background: '#ffffff',
                mixBlendMode: 'screen',
                animation: 'impactFlash 220ms ease-out forwards',
                zIndex: 3,
                pointerEvents: 'none',
              }}
            />
            {animKind === 'projectile' && (
              <div
                key={`ring-${animTick}`}
                style={{
                  position: 'absolute',
                  top: 108,
                  right: 78,
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: `2px solid ${animTint}`,
                  boxShadow: `0 0 16px ${animTint}aa`,
                  animation: 'impactRing 320ms ease-out forwards',
                  zIndex: 3,
                  pointerEvents: 'none',
                }}
              />
            )}
            {pendingAnimation && pendingAnimation.damage > 0 && (
              <div
                key={`dmg-${animTick}`}
                style={{
                  position: 'absolute',
                  top: 50,
                  right: 60,
                  fontSize: 14,
                  color: RPG.red,
                  textShadow: '0 0 6px #000, 1px 1px 0 #000, -1px -1px 0 #000',
                  animation: 'damageFloat 600ms ease-out forwards',
                  zIndex: 4,
                  pointerEvents: 'none',
                }}
              >
                -{pendingAnimation.damage}
              </div>
            )}
          </>
        )}

        {/* Hero status overlay */}
        <div
          style={{
            position: 'absolute',
            top: 140,
            left: 145,
            background: '#0a0614cc',
            border: `2px solid ${RPG.border}`,
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            zIndex: 1,
            minWidth: 140,
          }}
        >
          <div style={{ fontSize: 8, color: RPG.gold }}>
            {hero.name.toUpperCase()} Lv.{gameState.level}
          </div>
          <StatBar
            label="HP"
            value={gameState.hp}
            max={gameState.maxHp}
            pct={playerHpPct}
            color={RPG.green}
          />
          <StatBar
            label="MP"
            value={mana.current}
            max={MANA_MAX}
            pct={manaPct}
            color="#6699cc"
          />
          {secondaryKind && (
            <StatBar
              label={secondaryLabel}
              value={secondaryValue}
              max={secondaryMax}
              pct={secondaryPct}
              color={secondaryColor}
            />
          )}
          {dungeonState.pendingDamageMultiplier && dungeonState.pendingDamageMultiplier > 1 && (
            <div style={{ fontSize: 6, color: RPG.gold, marginTop: 2 }}>
              ✦ {dungeonState.pendingDamageMultiplier.toFixed(1)}× NEXT HIT
            </div>
          )}
        </div>
      </div>

      {/* Ability panel */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          background: '#08060e',
          borderTop: '3px solid #c8860a',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <div style={{ fontSize: 7, color: RPG.textDim, letterSpacing: 2, flexShrink: 0 }}>
          CHOOSE ABILITY → TRIGGERS LESSON
        </div>

        {outOfMana ? (
          <div
            style={{
              flex: 1,
              border: `2px solid ${RPG.gold}`,
              background: '#0e0c18',
              padding: '14px 12px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 10, color: RPG.gold }}>💧 OUT OF MANA</div>
            <div style={{ fontSize: 7, color: RPG.textDim, lineHeight: 1.6 }}>
              RESETS AT 4AM
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                overflowY: 'auto',
                flex: 1,
                minHeight: 0,
                paddingRight: 2,
              }}
            >
              {abilities.map((ab) => {
                const icon = effectIcon(ab);
                const color = iconColor(icon);
                const manaOk = debugMode || canAffordAbility(mana, ab.mpCost);
                const secOk = canAffordSecondary(secondary, ab.classType, ab.secondaryCost);
                const affordable = manaOk && secOk && !isAnimating;
                const selected = selectedAbilityId === ab.id;
                return (
                  <button
                    key={ab.id}
                    onClick={() => affordable && setSelectedAbilityId(ab.id)}
                    disabled={!affordable}
                    style={{
                      background: selected ? `${color}1a` : '#0e0c18',
                      border: `2px solid ${selected ? color : '#2a2040'}`,
                      padding: '8px 4px',
                      cursor: affordable ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: selected
                        ? `0 0 18px ${color}55, inset 0 0 10px ${color}11`
                        : 'none',
                      transition: 'all 0.12s',
                      opacity: affordable ? 1 : 0.4,
                      fontFamily: "'Press Start 2P'",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 20,
                        color,
                        textShadow: selected ? `0 0 12px ${color}` : 'none',
                        lineHeight: 1,
                      }}
                    >
                      {iconGlyph(icon)}
                    </div>
                    <div
                      style={{
                        fontSize: 7,
                        color: selected ? color : RPG.textDim,
                        textAlign: 'center',
                        lineHeight: 1.3,
                      }}
                    >
                      {ab.label.toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontSize: 6,
                        color: RPG.textDark,
                        borderTop: '1px solid #2a2040',
                        paddingTop: 3,
                        width: '100%',
                        textAlign: 'center',
                      }}
                    >
                      {ab.baseDamage > 0 ? `${ab.baseDamage} DMG` : 'SUPPORT'}
                    </div>
                    <div style={{ fontSize: 6, color: RPG.textDark }}>
                      MP {ab.mpCost}
                      {ab.secondaryCost ? ` · ${ab.secondaryCost}${secondaryLabel[0] ?? ''}` : ''}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedAbility && (
              <div
                style={{
                  background: '#0e0c18',
                  border: `2px solid ${iconColor(effectIcon(selectedAbility))}44`,
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  animation: 'fightSlideUp 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 8,
                      color: iconColor(effectIcon(selectedAbility)),
                    }}
                  >
                    {iconGlyph(effectIcon(selectedAbility))} {selectedAbility.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 6, color: RPG.textDim }}>
                    {selectedAbility.lessonQuestions}Q · MP {selectedAbility.mpCost}
                    {selectedAbility.secondaryCost
                      ? ` · -${selectedAbility.secondaryCost} ${secondaryLabel}`
                      : ''}
                    {selectedAbility.secondaryGain
                      ? ` · +${selectedAbility.secondaryGain} ${secondaryLabel}`
                      : ''}
                  </div>
                </div>
                <button
                  onClick={() => selectedAffordable && onAbilityChosen?.(selectedAbility.id)}
                  disabled={!selectedAffordable}
                  style={{
                    background: selectedAffordable
                      ? iconColor(effectIcon(selectedAbility))
                      : '#2a2040',
                    border: 'none',
                    padding: '8px 0',
                    fontFamily: "'Press Start 2P'",
                    fontSize: 8,
                    color: selectedAffordable ? '#08060e' : '#4a4060',
                    cursor: selectedAffordable ? 'pointer' : 'not-allowed',
                    boxShadow: selectedAffordable
                      ? `3px 3px 0 ${iconColor(effectIcon(selectedAbility))}66`
                      : 'none',
                    letterSpacing: 1,
                  }}
                >
                  ▶ USE ABILITY
                </button>
              </div>
            )}
          </>
        )}

        <button
          onClick={() => setScreen('home')}
          disabled={isAnimating}
          style={{
            background: 'transparent',
            border: 'none',
            fontFamily: "'Press Start 2P'",
            fontSize: 7,
            color: '#4a4060',
            cursor: isAnimating ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-end',
            letterSpacing: 1,
            flexShrink: 0,
            opacity: isAnimating ? 0.4 : 1,
          }}
        >
          ↩ FLEE
        </button>
      </div>
    </div>
  );
};

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  pct: number;
  color: string;
}

const StatBar: React.FC<StatBarProps> = ({ label, value, max, pct, color }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
      <span style={{ fontSize: 6, color: RPG.textDim }}>{label}</span>
      <span style={{ fontSize: 6, color }}>
        {value}/{max}
      </span>
    </div>
    <div
      style={{
        height: 7,
        background: '#050510',
        border: `1px solid ${color}`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          transition: 'width 0.4s',
        }}
      />
    </div>
  </div>
);

export default Dungeon;
