import { useEffect, useRef, useState } from 'react';
import type { AbilityTier, Hero, ScreenName, GameState, Tweaks } from './types';
import { INITIAL_STATE, TWEAK_DEFAULTS } from './constants';
import { loadSave, saveSave, wipeSave } from './save';
import { ABILITIES } from './game/dungeon';
import { applyAbility, clampPlayerHp } from './game/combat-engine';
import { NavBar } from './components/rpg';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import Dungeon from './screens/Dungeon';
import Lesson from './screens/Lesson';
import Loot from './screens/Loot';
import Profile from './screens/Profile';
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
  const [pendingAbility, setPendingAbility] = useState<AbilityTier | null>(null);

  useEffect(() => {
    saveSave({ hero, gameState });
  }, [hero, gameState]);

  const handleWipeSave = () => {
    wipeSave();
    setHero(null);
    setGameState(INITIAL_STATE);
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
      setScreen(dest);
      setTransition(false);
    }, 150);
  };

  const handleOnboardingComplete = (newHero: Hero) => {
    setHero(newHero);
    navigate('home');
  };

  const handleAbilityChosen = (tier: AbilityTier) => {
    setPendingAbility(tier);
    navigate('lesson');
  };

  const handleLessonComplete = (acc: number) => {
    if (!pendingAbility) return;
    const tier = pendingAbility;
    setGameState((prev) => {
      if (prev.dungeonState.currentMonsterIndex >= 0) {
        const result = applyAbility({
          dungeonState: prev.dungeonState,
          abilityTier: tier,
          lessonAccuracy: acc,
          equipmentDamageBonus: 0,
        });
        if (result.monsterDefeated) {
          // Loot routing lands in slice 6; observe the kill for now.
          console.log('[combat] monster defeated', {
            damageDealt: result.damageDealt,
            dungeonCleared: result.dungeonCleared,
          });
        }
        return {
          ...prev,
          hp: clampPlayerHp(prev.hp - result.counterDamage),
          xp: prev.xp + result.xpGained,
          dungeonState: result.nextDungeonState,
        };
      }
      return prev;
    });
    setPendingAbility(null);
  };

  const lessonQuestionCount =
    pendingAbility != null
      ? (ABILITIES.find((a) => a.tier === pendingAbility)?.lessonQuestions ?? 5)
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
          {hero === null ? (
            <Onboarding onComplete={handleOnboardingComplete} />
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
                {screen === 'loot' && <Loot {...screenProps} />}
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
              navigate('onboarding');
            }}
          />
        </TweakSection>
        <TweakSection label="Save">
          <TweakButton label="Wipe save" onClick={handleWipeSave} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

export default App;
