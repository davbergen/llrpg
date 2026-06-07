import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ClassType, Hero, ScreenName, GameState, Tweaks } from './types';
import { INITIAL_STATE, TWEAK_DEFAULTS } from './constants';
import { loadLocalSync, localOnlyRepo, authedRepo, WriteThroughRepo, type Repo } from './repos';
import { getActiveMonsters, sanitizeDungeonState } from './game/dungeon';
import { findAbilityById } from './game/class-abilities';
import { emptySecondaryResources, canAffordSecondary } from './game/secondary-resources';
import { resolveMana, canAffordAbility, initialManaState } from './game/mana';
import { applyConsumable } from './game/consumables';
import { initialGemLedger } from './game/gem-ledger';
import {
  applyRetry,
  canRetry,
  revertCardStore,
  type RetrySnapshot,
  GEMS_RETRY_COST,
} from './game/retry';
import { PersistentCardStore, type CardStore } from './game/fsrs-scheduler';
import { getCardStorage } from './repos/cardStorage';
import { resolveTurn } from './game/resolve-turn';
import { rollBossLoot, rollMonsterGold, rollMonsterLoot } from './game/loot';
import { NavBar, RPG, PixelPanel, PixelHeader, PixelButton, pixelBorderStyle } from './components/rpg';
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
import Settings from './screens/Settings';
import ConsentGate from './screens/ConsentGate';
import Shop from './screens/Shop';
import SignIn from './screens/SignIn';
import { useAuth, ensureHeroRow, signOut, exchangeDeepLinkCode } from './auth';
import { getOrCreateGuestId } from './repos/guestId';
import { useScheduledDeletion } from './gdpr/useScheduledDeletion';
import { isNative } from './platform';
import { maybeRequestNotificationPermission, scheduleFsrsReminders } from './notifications';
import { startBgm } from './bgm';

/**
 * Repairs a loaded save so a stale/renamed dungeon id can't crash boot. Applied
 * to every game state that comes from persistence (local cache + remote hydrate).
 */
function withValidDungeon(gs: GameState | undefined | null): GameState {
  const base = gs ?? INITIAL_STATE;
  return { ...base, dungeonState: sanitizeDungeonState(base.dungeonState) };
}
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
  const initialSave = useRef(loadLocalSync()).current;
  const repoRef = useRef<Repo>(localOnlyRepo());
  // Construct the persistent card store once at the app root and thread the
  // interface down (lesson read/write, retry-revert, FSRS reminders) so no
  // module below the root reaches for a singleton.
  const cardStoreRef = useRef<CardStore>(new PersistentCardStore(getCardStorage()));
  const hydratedForUserRef = useRef<string | null>(null);
  const [screen, setScreen] = useState<ScreenName>(initialSave?.hero ? 'home' : 'onboarding');
  const [hero, setHero] = useState<Hero | null>(initialSave?.hero ?? null);
  const [gameState, setGameState] = useState<GameState>(() => withValidDungeon(initialSave?.gameState));
  const [tweaks, setTweaks] = useState<Tweaks>(TWEAK_DEFAULTS);
  const [transition, setTransition] = useState(false);
  const [showTweaks, setShowTweaks] = useState(false);
  const [pendingAbility, setPendingAbility] = useState<string | null>(null);
  const [pendingLoot, setPendingLoot] = useState<LootReward | null>(null);
  const [pendingSnapshot, setPendingSnapshot] = useState<RetrySnapshot | null>(null);
  const [retryPrompt, setRetryPrompt] = useState<{ snapshot: RetrySnapshot; abilityId: string } | null>(null);
  const [showDefeat, setShowDefeat] = useState(false);
  const [pendingAnimation, setPendingAnimation] = useState<{
    abilityId: string;
    damage: number;
    heal: number;
    counterDamage: number;
    killed: boolean;
  } | null>(null);
  const pendingCommitRef = useRef<(() => void) | null>(null);
  const [authSkipped, setAuthSkipped] = useState(false);
  const [placementDone, setPlacementDone] = useState<boolean>(
    initialSave?.placementDone ?? !!initialSave?.hero,
  );
  const [welcomeAcknowledged, setWelcomeAcknowledged] = useState(false);
  const [pendingClass, setPendingClass] = useState<ClassType | null>(null);
  const [telemetryConsent, setTelemetryConsent] = useState<boolean | null>(
    initialSave?.telemetryConsent ?? null,
  );

  const auth = useAuth();
  const guestIdRef = useRef<string>(getOrCreateGuestId());
  const shopUserId = auth.status === 'signed-in' ? auth.user.id : guestIdRef.current;
  const deletion = useScheduledDeletion(auth.status === 'signed-in' ? auth.user.id : null);

  useEffect(() => {
    void repoRef.current.save({ hero, gameState, placementDone, telemetryConsent });
  }, [hero, gameState, placementDone, telemetryConsent]);

  const authUserId = auth.status === 'signed-in' ? auth.user.id : null;
  useEffect(() => {
    let cancelled = false;
    if (authUserId) {
      if (hydratedForUserRef.current === authUserId) return;
      const repo = authedRepo(authUserId);
      repoRef.current = repo;
      (async () => {
        try {
          await ensureHeroRow(authUserId);
          const remote = await repo.hydrateFromRemote();
          if (cancelled) return;
          if (remote) {
            // Server wins on reconnect — hydrate local state from remote.
            setHero(remote.hero);
            setGameState(withValidDungeon(remote.gameState));
            setPlacementDone(remote.placementDone ?? !!remote.hero);
            setTelemetryConsent(remote.telemetryConsent ?? null);
          } else {
            // First sign-in for this account — push the local profile up.
            await repo.pushLocalToRemote();
          }
          hydratedForUserRef.current = authUserId;
        } catch (e) {
          console.error('Repo hydration failed:', e);
        }
      })();
    } else {
      repoRef.current = localOnlyRepo();
      hydratedForUserRef.current = null;
    }
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  // Native only: finish Google OAuth when the system browser returns to the app
  // via our custom-scheme deep link. The web build never receives this event.
  useEffect(() => {
    if (!isNative()) return;
    let remove: (() => void) | undefined;
    let disposed = false;
    void (async () => {
      const { App: CapApp } = await import('@capacitor/app');
      const handle = await CapApp.addListener('appUrlOpen', ({ url }) => {
        void exchangeDeepLinkCode(url).catch((e) => {
          console.error('OAuth deep-link exchange failed:', e);
        });
      });
      if (disposed) {
        void handle.remove();
      } else {
        remove = () => void handle.remove();
      }
    })();
    return () => {
      disposed = true;
      remove?.();
    };
  }, []);

  // Native only: when the app is backgrounded, recompute the next horizon of FSRS
  // review reminders and re-arm local notifications. Scheduling at background time
  // means the queue reflects the freshest card state and costs nothing while the
  // user is active. No-ops on web and when notification permission was never granted.
  useEffect(() => {
    if (!isNative()) return;
    let remove: (() => void) | undefined;
    let disposed = false;
    void (async () => {
      const { App: CapApp } = await import('@capacitor/app');
      const handle = await CapApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) void scheduleFsrsReminders(cardStoreRef.current);
      });
      if (disposed) {
        void handle.remove();
      } else {
        remove = () => void handle.remove();
      }
    })();
    return () => {
      disposed = true;
      remove?.();
    };
  }, []);

  // Best-effort flush of any queued remote write when the tab regains focus / network.
  useEffect(() => {
    const flush = () => {
      const repo = repoRef.current;
      if (repo instanceof WriteThroughRepo) void repo.flush();
    };
    window.addEventListener('online', flush);
    window.addEventListener('focus', flush);
    return () => {
      window.removeEventListener('online', flush);
      window.removeEventListener('focus', flush);
    };
  }, []);

  const handleWipeSave = () => {
    void repoRef.current.wipe();
    setHero(null);
    setGameState(INITIAL_STATE);
    setPlacementDone(false);
    setWelcomeAcknowledged(false);
    setPendingClass(null);
    setTelemetryConsent(null);
    setScreen('onboarding');
  };

  const setTweak = <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
    setTweaks((prev) => ({ ...prev, [key]: value }));
  };

  // Start the looping background music by default. If the browser/webview blocks
  // autoplay, startBgm() retries on the first user gesture.
  useEffect(() => {
    startBgm();
  }, []);

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

  // Touch fallback for the debug panel: 5 quick taps in the top-right corner.
  // There is no keyboard on native/mobile, so the Cmd/Ctrl+. shortcut is unreachable there.
  const cornerTapCount = useRef(0);
  const cornerTapTimer = useRef<number | null>(null);
  const handleCornerTap = () => {
    if (cornerTapTimer.current !== null) window.clearTimeout(cornerTapTimer.current);
    cornerTapCount.current += 1;
    if (cornerTapCount.current >= 5) {
      cornerTapCount.current = 0;
      setShowTweaks((v) => !v);
      return;
    }
    cornerTapTimer.current = window.setTimeout(() => {
      cornerTapCount.current = 0;
    }, 800);
  };

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
    const baseMana = gameState.mana ?? initialManaState(Date.now());
    const resolvedMana = resolveMana(baseMana, Date.now());
    if (tweaks.debugMode) {
      // Debug mode: skip lesson entirely, resolve with a perfect-accuracy result.
      // No mana spend, no retry snapshot.
      setPendingSnapshot(null);
      resolveAbility(abilityId, {
        accuracy: 1,
        correctCount: ability.lessonQuestions,
        cardSnapshot: [],
        snapshotForRetry: null,
      });
      return;
    }
    if (!canAffordAbility(resolvedMana, ability.mpCost)) return;
    // Snapshot pre-lesson state so a 5-gem retry can fully revert it.
    setPendingSnapshot({
      hp: gameState.hp,
      mana: resolvedMana,
      dungeonState: gameState.dungeonState,
      secondaryResources: resources,
      cards: [],
    });
    // Deferred charge (#4): mana is NOT spent here — it is spent at lesson-commit
    // (see performCommit) so backing out of a lesson costs nothing. We still
    // persist the resolved mana so a 4am reset applies on entry.
    setGameState((prev) => ({ ...prev, mana: resolvedMana }));
    setPendingAbility(abilityId);
    navigate('lesson');
  };

  /**
   * Consume an inventory item by index (parallel to Profile's equipItem).
   * Applies the item's effect to the player's resources via the pure
   * `applyConsumable`, and removes the item only when it was actually consumed.
   */
  const consumeItem = (index: number) => {
    setGameState((prev) => {
      const item = prev.inventory[index];
      if (!item) return prev;
      const now = Date.now();
      const mana = resolveMana(prev.mana ?? initialManaState(now), now);
      const { resources, consumed } = applyConsumable(item, { mana });
      if (!consumed) return prev;
      return {
        ...prev,
        mana: resources.mana,
        inventory: prev.inventory.filter((_, i) => i !== index),
      };
    });
  };

  const handleLessonComplete = ({
    accuracy,
    correctCount,
    cardSnapshot,
  }: {
    accuracy: number;
    correctCount: number;
    totalCount: number;
    cardSnapshot: Array<[string, import('./game/fsrs-scheduler').CardState | null]>;
  }) => {
    if (!pendingAbility) return;
    // First completed review session is the moment to ask for notification
    // permission (native only, once). Fire-and-forget; it never blocks the flow.
    void maybeRequestNotificationPermission();
    const snapshotForRetry: RetrySnapshot | null = pendingSnapshot
      ? { ...pendingSnapshot, cards: cardSnapshot }
      : null;
    resolveAbility(pendingAbility, { accuracy, correctCount, cardSnapshot, snapshotForRetry });
  };

  const resolveAbility = (
    abilityId: string,
    {
      accuracy,
      snapshotForRetry,
    }: {
      accuracy: number;
      correctCount: number;
      cardSnapshot: Array<[string, import('./game/fsrs-scheduler').CardState | null]>;
      snapshotForRetry: RetrySnapshot | null;
    },
  ) => {
    const ability = findAbilityById(abilityId);
    if (!ability) return;
    const activeMonsters = getActiveMonsters(gameState.dungeonState);
    const activeProgress = gameState.dungeonState.progress[gameState.dungeonState.activeDungeonId];
    const monster = activeProgress ? activeMonsters[activeProgress.currentMonsterIndex] : undefined;

    // Pure turn computation lives in resolveTurn; this component only applies the
    // returned slice and handles routing/animation deferral.
    const turn = resolveTurn({
      ability,
      lessonAccuracy: accuracy,
      gameState,
      hero: hero!,
      now: Date.now(),
      debugMode: tweaks.debugMode,
      rollLoot: monster ? (m) => (m.isBoss ? rollBossLoot() : rollMonsterLoot(m)) : undefined,
      rollGold: monster ? (m) => rollMonsterGold(m) : undefined,
    });

    const performCommit = () => {
      setGameState((prev) => ({ ...prev, ...turn.nextState }));
      setPendingAbility(null);

      // Defeat takes priority over a failed-lesson retry: the fight was lost, not
      // just the lesson. Surface the defeat screen; the player retreats to the
      // (now full-HP) monster.
      if (turn.playerDefeated) {
        setPendingSnapshot(null);
        setPendingLoot(null);
        setShowDefeat(true);
        return;
      }

      // Offer retry on a failed session before navigating away.
      // Skip if the session somehow killed a monster — would require reverting loot/xp.
      if (
        snapshotForRetry &&
        !turn.monsterDefeated &&
        canRetry({ ledger: turn.nextState.gems, alreadyUsed: false, accuracy })
      ) {
        setRetryPrompt({ snapshot: snapshotForRetry, abilityId: ability.id });
        setPendingSnapshot(null);
        return;
      }
      setPendingSnapshot(null);

      if (turn.monsterDefeated && turn.monsterName) {
        setPendingLoot({
          monsterName: turn.monsterName,
          xp: turn.xpGained,
          gold: turn.goldGained,
          items: turn.loot,
          leveledUp: turn.leveledUp,
          newLevel: turn.newLevel,
          dungeonCleared: turn.dungeonCleared,
        });
        navigate('loot');
      } else {
        setPendingLoot(null);
        // Already on dungeon screen when animation case; harmless to re-navigate otherwise.
      }
    };

    if (turn.wantsAnimation) {
      // Defer commit until Dungeon finishes playing the ability animation.
      pendingCommitRef.current = performCommit;
      setPendingAnimation(turn.animation);
      navigate('dungeon');
    } else {
      performCommit();
      // performCommit surfaces the defeat screen on a lost fight; don't override.
      if (!turn.monsterDefeated && !turn.playerDefeated) navigate('dungeon');
    }
  };

  const handleAnimationComplete = () => {
    const commit = pendingCommitRef.current;
    pendingCommitRef.current = null;
    setPendingAnimation(null);
    if (commit) commit();
  };

  const handleRetryAccept = () => {
    if (!retryPrompt) return;
    const now = Date.now();
    revertCardStore(retryPrompt.snapshot, cardStoreRef.current);
    const reverted = applyRetry(retryPrompt.snapshot, gameState.gems ?? initialGemLedger(), now);
    setGameState((prev) => ({
      ...prev,
      hp: reverted.hp,
      mana: reverted.mana,
      dungeonState: reverted.dungeonState,
      secondaryResources: reverted.secondaryResources,
      gems: reverted.ledger,
    }));
    setRetryPrompt(null);
    setPendingAbility(null);
    navigate('dungeon');
  };

  const handleRetryDecline = () => {
    setRetryPrompt(null);
    navigate('dungeon');
  };

  const handleDefeatContinue = () => {
    setShowDefeat(false);
    navigate('dungeon');
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

  // Web renders inside a fixed phone frame; native fills the device edge-to-edge
  // with safe-area insets (handled in `frameStyle` below).
  const native = isNative();
  const frameW = 390;
  const frameH = 720;
  const scale = Math.min(
    (window.innerWidth - 40) / frameW,
    (window.innerHeight - 40) / frameH,
    1.2,
  );

  const frameStyle: CSSProperties = native
    ? {
        width: '100vw',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        background: '#1a1a2e',
        // box-sizing: border-box (set globally) keeps the insets inside 100dvh.
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }
    : {
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
      };

  const screenProps = {
    hero: hero!,
    setHero,
    gameState,
    setGameState,
    setScreen: navigate,
    consumeItem,
  };

  return (
    <>
      <div style={frameStyle}>
        {/* Hidden debug trigger for web: 5 quick taps in the top-right corner open the
            Tweaks panel. Web also has the Cmd/Ctrl+. shortcut; native uses the visible
            button below instead, since an invisible corner is unreliable on a touchscreen. */}
        {!native && (
          <div
            onPointerDown={handleCornerTap}
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 48,
              height: 48,
              zIndex: 1000,
              background: 'transparent',
            }}
          />
        )}
        {/* Native debug trigger: a visible button (no keyboard on device). Sits just below
            the app header on the right. TODO: gate behind a dev flag before store release. */}
        {native && (
          <button
            type="button"
            onPointerDown={() => setShowTweaks((v) => !v)}
            aria-label="Toggle debug menu"
            style={{
              position: 'fixed',
              top: 'calc(env(safe-area-inset-top) + 42px)',
              right: 'calc(env(safe-area-inset-right) + 8px)',
              width: 40,
              height: 40,
              borderRadius: 20,
              border: 'none',
              padding: 0,
              fontSize: 18,
              lineHeight: '40px',
              color: '#fff',
              background: 'rgba(0,0,0,0.35)',
              zIndex: 2147483645,
            }}
          >
            🐞
          </button>
        )}
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
          {deletion.scheduled && auth.status === 'signed-in' && (
            <DeletionBanner
              runAfter={deletion.scheduled.run_after}
              onCancel={() => {
                deletion.cancel().catch(() => deletion.refresh());
              }}
            />
          )}
          {auth.status === 'signed-out' && !authSkipped ? (
            <SignIn onSkip={() => setAuthSkipped(true)} />
          ) : hero === null && !welcomeAcknowledged && !placementDone ? (
            <OnboardingWelcome onContinue={() => setWelcomeAcknowledged(true)} />
          ) : hero === null && !placementDone ? (
            <Placement
              cardStore={cardStoreRef.current}
              onComplete={() => setPlacementDone(true)}
            />
          ) : hero === null && pendingClass === null ? (
            <OnboardingClass onPick={setPendingClass} />
          ) : hero === null ? (
            <OnboardingName classType={pendingClass!} onComplete={handleOnboardingComplete} />
          ) : telemetryConsent === null ? (
            <ConsentGate onAnswer={setTelemetryConsent} />
          ) : (
            <>
              <div
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                {screen === 'home' && <Home {...screenProps} />}
                {screen === 'dungeon' && (
                  <Dungeon
                    {...screenProps}
                    onAbilityChosen={handleAbilityChosen}
                    debugMode={tweaks.debugMode}
                    pendingAnimation={pendingAnimation}
                    onAnimationComplete={handleAnimationComplete}
                  />
                )}
                {screen === 'lesson' && (
                  <Lesson
                    {...screenProps}
                    cardStore={cardStoreRef.current}
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
                {screen === 'settings' && <Settings {...screenProps} />}
                {screen === 'shop' && <Shop {...screenProps} userId={shopUserId} />}
              </div>
              {/* Lesson guard (#4): hide the nav bar during a lesson so it
                  cannot be accidentally exited mid-flow, losing progress. */}
              {screen !== 'lesson' && <NavBar screen={screen} setScreen={navigate} />}
            </>
          )}
          {retryPrompt && (
            <RetryModal
              gemBalance={gameState.gems?.balance ?? 0}
              onAccept={handleRetryAccept}
              onDecline={handleRetryDecline}
            />
          )}
          {showDefeat && <DefeatModal onContinue={handleDefeatContinue} />}
        </div>

        {/* Home indicator — web frame only; native uses the real gesture bar. */}
        {!native && (
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
        )}
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
          <TweakButton label="→ Shop" onClick={() => navigate('shop')} />
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
          <TweakToggle
            label="Debug Mode (∞ MP, skip lessons)"
            value={tweaks.debugMode}
            onChange={(v) => setTweak('debugMode', v)}
          />
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

interface DeletionBannerProps {
  runAfter: string;
  onCancel: () => void;
}

function DeletionBanner({ runAfter, onCancel }: DeletionBannerProps) {
  return (
    <div
      style={{
        background: '#3a0a0a',
        borderBottom: `2px solid ${RPG.red}`,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          fontFamily: "'Courier Prime', monospace",
          fontSize: 10,
          color: RPG.text,
          lineHeight: 1.4,
        }}
      >
        Deletion at <b>{new Date(runAfter).toLocaleString()}</b>
      </div>
      <button
        onClick={onCancel}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 7,
          color: RPG.text,
          background: RPG.red,
          border: `1px solid ${RPG.text}`,
          padding: '5px 8px',
          cursor: 'pointer',
        }}
      >
        CANCEL
      </button>
    </div>
  );
}

interface RetryModalProps {
  gemBalance: number;
  onAccept: () => void;
  onDecline: () => void;
}

function RetryModal({ gemBalance, onAccept, onDecline }: RetryModalProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 100,
      }}
    >
      <PixelPanel gold style={{ width: '100%', maxWidth: 320 }}>
        <PixelHeader size={11}>LESSON FAILED</PixelHeader>
        <div
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 12,
            color: RPG.text,
            lineHeight: 1.5,
            marginBottom: 14,
          }}
        >
          You scored under 50%. Spend {GEMS_RETRY_COST} gems to retry — your mana, HP, and card
          progress will be restored.
        </div>
        <div
          style={{
            ...pixelBorderStyle(RPG.border, RPG.panelDark),
            padding: '8px 10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: RPG.textDim }}>
            BALANCE
          </span>
          <span style={{ fontFamily: "'Press Start 2P'", fontSize: 11, color: RPG.purple }}>
            💎 {gemBalance}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PixelButton onClick={onAccept} sound="confirm" variant="green" style={{ width: '100%' }}>
            💎 RETRY ({GEMS_RETRY_COST})
          </PixelButton>
          <PixelButton onClick={onDecline} variant="grey" style={{ width: '100%' }}>
            CONTINUE
          </PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}

interface DefeatModalProps {
  onContinue: () => void;
}

function DefeatModal({ onContinue }: DefeatModalProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 100,
      }}
    >
      <PixelPanel style={{ width: '100%', maxWidth: 320 }}>
        <PixelHeader size={13} color={RPG.red}>
          DEFEATED
        </PixelHeader>
        <div
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 12,
            color: RPG.text,
            lineHeight: 1.5,
            margin: '12px 0 16px',
          }}
        >
          You fell in battle. You retreat and recover — fully healed, but the monster
          stands at full strength again. Try once more.
        </div>
        <PixelButton onClick={onContinue} sound="confirm" variant="red" style={{ width: '100%' }}>
          ↩ RETREAT
        </PixelButton>
      </PixelPanel>
    </div>
  );
}

export default App;
