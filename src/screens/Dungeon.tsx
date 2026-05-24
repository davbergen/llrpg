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
  heal: number;
  counterDamage: number;
  killed: boolean;
}

interface DungeonProps extends ScreenProps {
  onAbilityChosen?: (abilityId: string) => void;
  debugMode?: boolean;
  pendingAnimation?: PendingAnimation | null;
  onAnimationComplete?: () => void;
}

type AnimationKind = 'melee' | 'projectile' | 'heal' | 'shield';

const SUPPORT_TOTAL_MS = 600;
type Trajectory = 'straight' | 'arc-low' | 'arc-high';

interface AnimSpec {
  kind: AnimationKind;
  // Melee:
  lungePx?: number;
  // Projectile:
  tint?: string;
  size?: number;
  travelMs?: number;
  trajectory?: Trajectory;
  // Shared timings (optional overrides):
  totalMs?: number;
}

const DEFAULT_MELEE: Required<Pick<AnimSpec, 'lungePx' | 'totalMs'>> & { impactMs: number } = {
  lungePx: 200,
  totalMs: 600,
  impactMs: 250,
};

const DEFAULT_PROJECTILE: Required<
  Pick<AnimSpec, 'tint' | 'size' | 'travelMs' | 'trajectory' | 'totalMs'>
> = {
  tint: '#9b5de5',
  size: 14,
  travelMs: 400,
  trajectory: 'straight',
  totalMs: 600,
};

const REDUCED_TOTAL_MS = 100;
const REDUCED_IMPACT_MS = 50;

const ABILITY_ANIM: Record<string, AnimSpec> = {
  // ── Mage — all projectile, varied size/speed/trajectory/tint ──
  mage_spark:           { kind: 'projectile', tint: '#ffe066', size: 8,  travelMs: 240, trajectory: 'straight', totalMs: 520 },
  mage_fireball:        { kind: 'projectile', tint: '#ff7a3a', size: 18, travelMs: 420, trajectory: 'arc-low' },
  mage_frostbolt:       { kind: 'projectile', tint: '#4a9edd', size: 14, travelMs: 360, trajectory: 'straight' },
  mage_arcane_pulse:    { kind: 'projectile', tint: '#9b5de5', size: 22, travelMs: 500, trajectory: 'straight', totalMs: 700 },
  mage_meteor:          { kind: 'projectile', tint: '#ff5a2a', size: 30, travelMs: 620, trajectory: 'arc-high', totalMs: 820 },
  mage_chain_lightning: { kind: 'projectile', tint: '#a8e0ff', size: 12, travelMs: 220, trajectory: 'straight', totalMs: 480 },
  mage_cataclysm:       { kind: 'projectile', tint: '#e64a8a', size: 34, travelMs: 680, trajectory: 'arc-high', totalMs: 880 },

  // ── Warrior — all melee, varied lunge + total ──
  warrior_slash:           { kind: 'melee', lungePx: 180, totalMs: 500 },
  warrior_cleave:          { kind: 'melee', lungePx: 210, totalMs: 620 },
  warrior_reckless_strike: { kind: 'melee', lungePx: 240, totalMs: 540 },
  warrior_bash:            { kind: 'melee', lungePx: 200, totalMs: 720 },
  warrior_execute:         { kind: 'melee', lungePx: 260, totalMs: 780 },

  // ── Priest — damaging spells as holy projectiles ──
  priest_smite:          { kind: 'projectile', tint: '#fff2a8', size: 12, travelMs: 300, trajectory: 'straight' },
  priest_holy_bolt:      { kind: 'projectile', tint: '#fff2a8', size: 16, travelMs: 380, trajectory: 'straight' },
  priest_radiant_strike: { kind: 'projectile', tint: '#ffe066', size: 18, travelMs: 360, trajectory: 'arc-low' },
  priest_judgment:       { kind: 'projectile', tint: '#ffec8a', size: 26, travelMs: 520, trajectory: 'arc-high', totalMs: 720 },
};

function animSpecFor(ab: ClassAbility): AnimSpec {
  // Pure support abilities (no direct damage) get a support animation anchored on hero.
  if (ab.baseDamage === 0) {
    const icon = effectIcon(ab);
    if (icon === 'heart') return { kind: 'heal', totalMs: SUPPORT_TOTAL_MS };
    if (icon === 'shield') return { kind: 'shield', totalMs: SUPPORT_TOTAL_MS };
  }
  return ABILITY_ANIM[ab.id] ?? { kind: 'projectile' };
}

function meleeImpactMs(totalMs: number): number {
  // Impact lands during the held-forward portion of meleeLunge (~42%).
  return Math.round(totalMs * 0.42);
}

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
  const animSpec: AnimSpec | null = animatingAbility ? animSpecFor(animatingAbility) : null;
  const animKind: AnimationKind | null = animSpec?.kind ?? null;
  const isAnimating = pendingAnimation != null;

  // Resolved per-ability timings (with sensible defaults).
  const meleeLunge = animSpec?.lungePx ?? DEFAULT_MELEE.lungePx;
  const meleeTotal = animSpec?.totalMs ?? DEFAULT_MELEE.totalMs;
  const projTint = animSpec?.tint ?? DEFAULT_PROJECTILE.tint;
  const projSize = animSpec?.size ?? DEFAULT_PROJECTILE.size;
  const projTravel = animSpec?.travelMs ?? DEFAULT_PROJECTILE.travelMs;
  const projTrajectory = animSpec?.trajectory ?? DEFAULT_PROJECTILE.trajectory;
  const projTotal = animSpec?.totalMs ?? DEFAULT_PROJECTILE.totalMs;

  useEffect(() => {
    if (!pendingAnimation || !animSpec) {
      setAnimPhase(null);
      return;
    }
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const supportKind = animSpec.kind === 'heal' || animSpec.kind === 'shield';
    const supportTotal = animSpec.totalMs ?? SUPPORT_TOTAL_MS;
    const impactAt = reduced
      ? REDUCED_IMPACT_MS
      : animSpec.kind === 'projectile'
        ? projTravel
        : supportKind
          ? Math.round(supportTotal * 0.4)
          : meleeImpactMs(meleeTotal);
    const totalAt = reduced
      ? REDUCED_TOTAL_MS
      : animSpec.kind === 'projectile'
        ? projTotal
        : supportKind
          ? supportTotal
          : meleeTotal;
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
    // Resolved timings derive from pendingAnimation; depend on the trigger only.
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
          42% { transform: translateX(var(--lunge-x, 200px)); }
          58% { transform: translateX(var(--lunge-x, 200px)); }
          100% { transform: translateX(0); }
        }
        @keyframes projectileFly {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          50% {
            transform:
              translate(calc(var(--projectile-dx) * 0.5), var(--projectile-mid-dy, 0px))
              scale(1.05);
          }
          100% {
            transform: translate(var(--projectile-dx), var(--projectile-dy)) scale(0.9);
            opacity: 1;
          }
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
        @keyframes healSparkle {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate(var(--sparkle-dx, 0px), -52px) scale(1); opacity: 0; }
        }
        @keyframes healGlow {
          0%,100% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
          40% { opacity: 0.85; transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes shieldRing {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          25% { opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes meleeLunge { 0%,100% { transform: translateX(0); } }
          @keyframes projectileFly { from,to { transform: translate(0,0); opacity: 0.6; } }
          @keyframes impactRing { 0%,100% { opacity: 0; } }
          @keyframes monsterShake { 0%,100% { transform: translateX(0); } }
          @keyframes healSparkle { 0%,100% { opacity: 0; } }
          @keyframes healGlow { 0%,100% { opacity: 0; } }
          @keyframes shieldRing { 0%,100% { opacity: 0; } }
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
            ['--lunge-x' as string]: `${meleeLunge}px`,
            animation:
              isAnimating && animKind === 'melee'
                ? `meleeLunge ${meleeTotal}ms ease-out`
                : undefined,
          }}
        >
          <PixelGrid grid={heroSprite} scale={9} />
        </div>

        {/* Projectile orb */}
        {isAnimating && animKind === 'projectile' && animPhase === 'travel' && (
          <div
            key={`proj-${animTick}`}
            style={{
              position: 'absolute',
              // Start near hero center, travel to monster center.
              top: 168 - projSize / 2,
              left: 70 - projSize / 2,
              width: projSize,
              height: projSize,
              borderRadius: '50%',
              background: projTint,
              boxShadow: `0 0 ${projSize * 0.9}px ${projTint}, 0 0 ${projSize * 1.8}px ${projTint}aa, inset 0 0 ${Math.max(4, projSize * 0.4)}px #ffffffaa`,
              ['--projectile-dx' as string]: '240px',
              ['--projectile-dy' as string]: '-60px',
              ['--projectile-mid-dy' as string]:
                projTrajectory === 'arc-high'
                  ? '-140px'
                  : projTrajectory === 'arc-low'
                    ? '-90px'
                    : '-30px',
              animation: `projectileFly ${projTravel}ms linear forwards`,
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
                  border: `2px solid ${projTint}`,
                  boxShadow: `0 0 16px ${projTint}aa`,
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

        {/* Heal animation — green sparkles + glow pulse anchored on hero */}
        {isAnimating && animKind === 'heal' && (
          <>
            <div
              key={`heal-glow-${animTick}`}
              style={{
                position: 'absolute',
                top: 175,
                left: 65,
                width: 110,
                height: 110,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, #5be38a88 0%, #5be38a33 45%, transparent 75%)',
                animation: `healGlow ${animSpec?.totalMs ?? SUPPORT_TOTAL_MS}ms ease-out forwards`,
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />
            {[0, 1, 2, 3, 4].map((i) => {
              const dx = (i - 2) * 9;
              const delay = i * 80;
              return (
                <div
                  key={`heal-spark-${animTick}-${i}`}
                  style={{
                    position: 'absolute',
                    top: 200,
                    left: 65 + dx - 3,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#a8f5b8',
                    boxShadow: '0 0 8px #a8f5b8, 0 0 14px #5be38aaa',
                    ['--sparkle-dx' as string]: `${dx * 0.6}px`,
                    animation: `healSparkle ${
                      (animSpec?.totalMs ?? SUPPORT_TOTAL_MS) - delay
                    }ms ease-out ${delay}ms forwards`,
                    opacity: 0,
                    zIndex: 3,
                    pointerEvents: 'none',
                  }}
                />
              );
            })}
            {pendingAnimation && pendingAnimation.heal > 0 && (
              <div
                key={`heal-num-${animTick}`}
                style={{
                  position: 'absolute',
                  top: 130,
                  left: 65,
                  fontSize: 12,
                  color: RPG.green,
                  textShadow: '0 0 6px #000, 1px 1px 0 #000, -1px -1px 0 #000',
                  animation: 'damageFloat 700ms ease-out forwards',
                  zIndex: 4,
                  pointerEvents: 'none',
                }}
              >
                +{pendingAnimation.heal} HP
              </div>
            )}
          </>
        )}

        {/* Shield animation — translucent blue ring scales out around hero */}
        {isAnimating && animKind === 'shield' && (
          <div
            key={`shield-ring-${animTick}`}
            style={{
              position: 'absolute',
              top: 175,
              left: 65,
              width: 120,
              height: 120,
              borderRadius: '50%',
              border: `3px solid ${RPG.blue}`,
              boxShadow: `0 0 18px ${RPG.blue}cc, inset 0 0 18px ${RPG.blue}66`,
              background: `radial-gradient(circle, ${RPG.blue}22 0%, transparent 65%)`,
              animation: `shieldRing ${animSpec?.totalMs ?? SUPPORT_TOTAL_MS}ms ease-out forwards`,
              zIndex: 3,
              pointerEvents: 'none',
            }}
          />
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
