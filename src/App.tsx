import { useEffect, useRef, useState } from 'react';
import type { ClassType, Hero, ScreenName, GameState, Tweaks } from './types';
import { INITIAL_STATE, TWEAK_DEFAULTS } from './constants';
import { loadSave, saveSave, wipeSave } from './save';
import { getActiveMonsters } from './game/dungeon';
import { applyAbility, clampPlayerHp } from './game/combat-engine';
import { findAbilityById } from './game/class-abilities';
import { emptySecondaryResources, canAffordSecondary } from './game/secondary-resources';
import { resolveMana, spendMana, canAffordAbility, applyFirstLessonBonus, initialManaState } from './game/mana';
import { addXp } from './game/progression';
import { rollBossLoot, rollMonsterGold, rollMonsterLoot } from './game/loot';
import { calcStats } from './game/stats';
import { NavBar } from './components/rpg';
import {
  OnboardingWelcome,
  OnboardingClass,
  OnboardingName,
} from './screens/Onboarding';
import Placement from './screens/Placement';
import Home from './screens/Home';
import Dungeon from './screens/Dungeon';
import Lesson from './screens/Lesson';
import Loot, { type LootReward } from './screens/Loot';
import Profile from './screens/Profile';
import SignIn from './screens/SignIn';
import { useAuth, ensureHeroRow, signOut } from './auth';

const XP_PER_CORRECT_ANSWER = 5;
import {
  TweaksPanel,
  TweakSection,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakColor,
  TweakButton,
} from './tweaks';

function App() {
  const initialSave = useRef(loadSave()).current;
  const [screen, setScreen] = useState<ScreenName>(initialSave?.hero ? 'home' : 'onboarding');
  const [hero, setHero] = useState<Hero | null>(initialSave?.hero ?? null);
  const [gameState, setGameState] = useState<GameState>(initialSave?.gameState ?? INITIAL_STATE);
  const [tweaks, setTweaks] = useState<Tweaks>(TWEAK_DEFAULTS);
  const [transition, setTransition] = useState(false);
  const [showTweaks, setShowTweaks] = useState(false);
  const [pendingAbility, setPendingAbility] = useState<string | null>(null);
  const [pendingLoot, setPendingLoot] = useState<LootReward | null>(null);
  const [authSkipped, setAuthSkipped] = useState(false);
  const [placementDone, setPlacementDone] = useState<boolean>(
    initialSave?.placementDone ?? !!initialSave?.hero,
  );
  const [welcomeAcknowledged, setWelcomeAcknowledged] = useState(false);
  const [pendingClass, setPendingClass] = useState<ClassType | null>(null);

  const auth = useAuth();

  useEffect(() => {
    saveSave({ hero, gameState, placementDone });
  }, [hero, gameState, placementDone]);

  const authUserId = auth.status === 'signed-in' ? auth.user.id : null;
  useEffect(() => {
    if (authUserId) {
      ensureHeroRow(authUserId).catch((e) => {
        console.error('Failed to bootstrap heroes row:', e);
      });
    }
  }, [authUserId]);

  const handleWipeSave = () => {
    wipeSave();
    setHero(null);
    setGameState(INITIAL_STATE);
    setPlacementDone(false);
    setWelcomeAcknowledged(false);
    setPendingClass(null);
    setScreen('onboarding');
  };

  const setTweak = <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
    setTweaks((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        setShowTweaks((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const navigate = (dest: ScreenName) => {
    setTransition(true);
    setTimeout(() => {
      setScreen((prev) => {
        // Reset secondary resources + queued buffs when leaving the dungeon for home.
        if (prev === 'dungeon' && dest === 'home') {
          setGameState((g) => ({
            ...g,
            secondaryResources: emptySecondaryResources(),
            dungeonState: { ...g.dungeonState, pendingDamageMultiplier: undefined },
          }));
        }
        return dest;
      });
      setTransition(false);
    }, 150);
  };

  const handleOnboardingComplete = (newHero: Hero) => {
    setHero(newHero);
    setPendingClass(null);
    navigate('home');
  };

  const handleAbilityChosen = (abilityId: string) => {
    const ability = findAbilityById(abilityId);
    if (!ability) return;
    const resources = gameState.secondaryResources ?? emptySecondaryResources();
    if (!canAffordSecondary(resources, ability.classType, ability.secondaryCost)) return;
    setGameState((prev) => {
      const baseMana = prev.mana ?? initialManaState(Date.now());
      const resolved = resolveMana(baseMana, Date.now());
      if (!canAffordAbility(resolved, ability.mpCost)) return prev;
      return { ...prev, mana: spendMana(resolved, ability.mpCost) };
    });
    setPendingAbility(abilityId);
    navigate('lesson');
  };

  const handleLessonComplete = ({
    accuracy,
    correctCount,
  }: {
    accuracy: number;
    correctCount: number;
    totalCount: number;
  }) => {
    if (!pendingAbility) return;
    const ability = findAbilityById(pendingAbility);
    if (!ability) return;
    const activeMonsters = getActiveMonsters(gameState.dungeonState);
    const activeProgress = gameState.dungeonState.progress[gameState.dungeonState.activeDungeonId];
    const monster = activeProgress ? activeMonsters[activeProgress.currentMonsterIndex] : undefined;
    const result = applyAbility({
      dungeonState: gameState.dungeonState,
      ability,
      secondaryResources: gameState.secondaryResources ?? emptySecondaryResources(),
      lessonAccuracy: accuracy,
      equipmentDamageBonus: calcStats(hero!, hero!.equipment, gameState.level).damageBonus,
      rollLoot: monster ? (m) => (m.isBoss ? rollBossLoot() : rollMonsterLoot(m)) : undefined,
      rollGold: monster ? (m) => rollMonsterGold(m) : undefined,
    });

    const lessonXp = correctCount * XP_PER_CORRECT_ANSWER;
    const totalXpDelta = lessonXp + result.xpGained;
    const progress = addXp(
      { xp: gameState.xp, level: gameState.level, maxXp: gameState.maxXp },
      totalXpDelta,
    );

    const nextMaxHp = gameState.maxHp + progress.maxHpDelta;
    const healed = clampPlayerHp(gameState.hp - result.counterDamage) + result.selfHeal;
    const baseHp = Math.max(1, healed);
    const nextHp = progress.leveledUp ? nextMaxHp : Math.min(baseHp, nextMaxHp);

    const resourcesAfterRun = result.dungeonCleared
      ? emptySecondaryResources()
      : result.nextSecondaryResources;
    const dungeonAfterRun = result.dungeonCleared
      ? { ...result.nextDungeonState, pendingDamageMultiplier: undefined }
      : result.nextDungeonState;

    setGameState((prev) => {
      const baseMana = prev.mana ?? initialManaState(Date.now());
      const manaAfterBonus = baseMana.firstLessonBonusUsedToday
        ? baseMana
        : applyFirstLessonBonus(baseMana);
      return {
        ...prev,
        hp: nextHp,
        maxHp: nextMaxHp,
        xp: progress.xp,
        level: progress.level,
        maxXp: progress.maxXp,
        gold: prev.gold + result.goldGained,
        inventory: [...prev.inventory, ...result.lootDrops],
        dungeonState: dungeonAfterRun,
        mana: manaAfterBonus,
        secondaryResources: resourcesAfterRun,
      };
    });
    setPendingAbility(null);

    if (result.monsterDefeated && monster) {
      setPendingLoot({
        monsterName: monster.name,
        xp: totalXpDelta,
        gold: result.goldGained,
        items: result.lootDrops,
        leveledUp: progress.leveledUp,
        newLevel: progress.level,
        dungeonCleared: result.dungeonCleared,
      });
      navigate('loot');
    } else {
      setPendingLoot(null);
      navigate('dungeon');
    }
  };

  const handleLootContinue = () => {
    const wasCleared = pendingLoot?.dungeonCleared ?? false;
    setPendingLoot(null);
    navigate(wasCleared ? 'home' : 'dungeon');
  };

  const lessonQuestionCount =
    pendingAbility != null
      ? (findAbilityById(pendingAbility)?.lessonQuestions ?? 5)
      : undefined;

  // Phone frame dimensions
  const frameW = 390;
  const frameH = 720;
  const scale = Math.min(
    (window.innerWidth - 40) / frameW,
    (window.innerHeight - 40) / frameH,
    1.2,
  );

  const screenProps = {
    hero: hero!,
    setHero,
    gameState,
    setGameState,
    setScreen: navigate,
  };

  return (
    <>
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          width: frameW,
          height: frameH,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          background: '#1a1a2e',
          boxShadow:
            '0 0 60px rgba(0,0,0,0.8), 0 0 0 2px #c8860a, 0 0 0 5px #0a0a14, 0 0 0 7px #c8860a',
        }}
      >
        {/* Status bar */}
        <div
          style={{
            height: 36,
            background: '#0f0f1e',
            borderBottom: '2px solid #c8860a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            flexShrink: 0,
          }}
        >
          <div style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: '#e6a817' }}>
            LINGUA<span style={{ color: '#f0e6c8' }}>QUEST</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: '#a09070' }}>
              💰{gameState.gold}
            </div>
            <div style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: '#a09070' }}>
              {new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: 8 * (i / 4),
                    background: i <= 3 ? '#e6a817' : '#3a3a4a',
                    alignSelf: 'flex-end',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Screen area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            opacity: transition ? 0 : 1,
            transform: transition ? 'translateY(8px)' : 'translateY(0)',
            transition: 'opacity 0.15s ease, transform 0.15s ease',
            fontSize: `${tweaks.fontSize}%`,
          }}
        >
          {auth.status === 'signed-out' && !authSkipped ? (
            <SignIn onSkip={() => setAuthSkipped(true)} />
          ) : hero === null && !welcomeAcknowledged && !placementDone ? (
            <OnboardingWelcome onContinue={() => setWelcomeAcknowledged(true)} />
          ) : hero === null && !placementDone ? (
            <Placement onComplete={() => setPlacementDone(true)} />
          ) : hero === null && pendingClass === null ? (
            <OnboardingClass onPick={setPendingClass} />
          ) : hero === null ? (
            <OnboardingName classType={pendingClass!} onComplete={handleOnboardingComplete} />
          ) : (
            <>
              <div
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                {screen === 'home' && <Home {...screenProps} />}
                {screen === 'dungeon' && (
                  <Dungeon {...screenProps} onAbilityChosen={handleAbilityChosen} />
                )}
                {screen === 'lesson' && (
                  <Lesson
                    {...screenProps}
                    questionCount={lessonQuestionCount}
                    onComplete={pendingAbility ? handleLessonComplete : undefined}
                    completeDestination={pendingAbility ? 'dungeon' : 'home'}
                    completeLabel={pendingAbility ? '⚔ BACK TO DUNGEON' : '🏠 HOME'}
                  />
                )}
                {screen === 'loot' && (
                  <Loot
                    {...screenProps}
                    reward={pendingLoot}
                    onContinue={handleLootContinue}
                  />
                )}
                {screen === 'profile' && <Profile {...screenProps} />}
              </div>
              <NavBar screen={screen} setScreen={navigate} />
            </>
          )}
        </div>

        {/* Home indicator */}
        <div
          style={{
            height: 20,
            background: '#0f0f1e',
            borderTop: '1px solid #1a1a2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 100,
              height: 4,
              background: '#3a3a5a',
              borderRadius: 2,
            }}
          />
        </div>
      </div>

      <TweaksPanel open={showTweaks} onClose={() => setShowTweaks(false)}>
        <TweakSection label="Theme">
          <TweakColor
            label="Accent Color"
            value={tweaks.accentColor}
            onChange={(v) => setTweak('accentColor', v)}
          />
          <TweakRadio
            label="Panel Style"
            options={['dark', 'warm', 'cool'] as const}
            value={tweaks.panelStyle}
            onChange={(v) => setTweak('panelStyle', v)}
          />
        </TweakSection>
        <TweakSection label="Gameplay">
          <TweakToggle
            label="Show Party Quest"
            value={tweaks.showPartyQuest}
            onChange={(v) => setTweak('showPartyQuest', v)}
          />
          <TweakSlider
            label="UI Scale"
            min={80}
            max={120}
            step={5}
            unit="%"
            value={tweaks.fontSize}
            onChange={(v) => setTweak('fontSize', v)}
          />
        </TweakSection>
        <TweakSection label="Quick Nav">
          <TweakButton label="→ Home" onClick={() => navigate('home')} />
          <TweakButton label="→ Dungeon" onClick={() => navigate('dungeon')} />
          <TweakButton label="→ Lesson" onClick={() => navigate('lesson')} />
          <TweakButton label="→ Loot" onClick={() => navigate('loot')} />
          <TweakButton label="→ Profile" onClick={() => navigate('profile')} />
          <TweakButton
            label="↩ Onboarding"
            onClick={() => {
              setHero(null);
              setGameState(INITIAL_STATE);
              setPlacementDone(false);
              setWelcomeAcknowledged(false);
              setPendingClass(null);
              navigate('onboarding');
            }}
          />
        </TweakSection>
        <TweakSection label="Debug">
          <TweakButton
            label="Show level-up screen"
            onClick={() => {
              setPendingLoot({
                monsterName: 'Test Monster',
                xp: 25,
                gold: 10,
                items: [],
                leveledUp: true,
                newLevel: gameState.level + 1,
                dungeonCleared: false,
              });
              navigate('loot');
            }}
          />
          <TweakButton
            label="Refill mana now"
            onClick={() =>
              setGameState((prev) => ({
                ...prev,
                mana: initialManaState(Date.now()),
              }))
            }
          />
        </TweakSection>
        <TweakSection label="Save">
          <TweakButton label="Wipe save" onClick={handleWipeSave} />
        </TweakSection>
        <TweakSection label="Auth">
          <TweakButton
            label={auth.status === 'signed-in' ? `Sign out (${auth.user.email ?? 'user'})` : 'Show sign-in'}
            onClick={() => {
              if (auth.status === 'signed-in') {
                signOut().catch((e) => console.error(e));
              } else {
                setAuthSkipped(false);
              }
            }}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

export default App;
