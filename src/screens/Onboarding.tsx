import { useState } from 'react';
import type { Hero, ClassType } from '../types';
import { EMPTY_EQUIPMENT } from '../constants';
import {
  RPG,
  pixelBorderStyle,
  PixelPanel,
  PixelHeader,
  PixelButton,
  CharSprite,
} from '../components/rpg';

interface ClassDef {
  id: ClassType;
  name: string;
  kanji: string;
  desc: string;
  stat1: { label: string; val: number };
  stat2: { label: string; val: number };
  color: string;
  ability: string;
}

const CLASSES: ClassDef[] = [
  {
    id: 'mage',
    name: 'Mage',
    kanji: '魔法使い',
    desc: 'Master of grammar & kanji. Bonus XP on writing exercises.',
    stat1: { label: 'Grammar', val: 90 },
    stat2: { label: 'Speed', val: 50 },
    color: '#9b5de5',
    ability: 'Spell Scroll: Unlock kanji early',
  },
  {
    id: 'warrior',
    name: 'Warrior',
    kanji: '戦士',
    desc: 'Brute-force vocab memorizer. High HP, never misses a streak.',
    stat1: { label: 'Vocab', val: 90 },
    stat2: { label: 'HP Regen', val: 80 },
    color: '#c44b4b',
    ability: 'Iron Will: Streak shield once/week',
  },
  {
    id: 'priest',
    name: 'Priest',
    kanji: '僧侶',
    desc: 'Sustain caster. Generates Faith from offense, spends it to heal.',
    stat1: { label: 'Faith', val: 90 },
    stat2: { label: 'Healing', val: 85 },
    color: '#f4e060',
    ability: 'Sacred Verse: Self-heal on faith spend',
  },
];

const radialBg = `radial-gradient(ellipse at center, #1e2a4a 0%, ${RPG.bg} 70%)`;

function MiniStatBar({ label, val, color }: { label: string; val: number; color: string }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: RPG.textDim }}>
          {label}
        </span>
        <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color }}>{val}%</span>
      </div>
      <div
        style={{
          height: 8,
          background: '#0a0a14',
          border: `1px solid ${RPG.border}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${val}%`,
            height: '100%',
            background: color,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  );
}

export function OnboardingWelcome({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        gap: 20,
        background: radialBg,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: 22,
            color: RPG.gold,
            lineHeight: 1.5,
            textShadow: `3px 3px 0 #7a4e08, 0 0 30px ${RPG.gold}66`,
            letterSpacing: 2,
          }}
        >
          LINGUA
          <br />
          QUEST
        </div>
        <div
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: 9,
            color: RPG.textDim,
            marginTop: 8,
          }}
        >
          日本語 ADVENTURES
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', margin: '8px 0' }}>
        {(['mage', 'warrior', 'priest'] as ClassType[]).map((c) => (
          <div key={c} style={{ opacity: 0.7, transform: 'scale(0.7)' }}>
            <CharSprite classType={c} size={48} />
          </div>
        ))}
      </div>

      <PixelPanel style={{ width: '100%' }}>
        <div
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 13,
            color: RPG.text,
            lineHeight: 1.7,
            textAlign: 'center',
          }}
        >
          Embark on an epic journey to master the Japanese language. Complete daily quests, battle
          grammar bosses, and collect legendary vocabulary!
        </div>
      </PixelPanel>

      <PixelButton onClick={onContinue} style={{ width: '100%' }}>
        ▶ BEGIN ADVENTURE
      </PixelButton>
      <div style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: RPG.textDim }}>
        ✦ NEW HERO ✦
      </div>
    </div>
  );
}

export function OnboardingClass({ onPick }: { onPick: (classType: ClassType) => void }) {
  const [selected, setSelected] = useState<ClassType | null>(null);
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 14px',
        gap: 14,
        overflowY: 'auto',
        background: radialBg,
      }}
    >
      <PixelHeader size={12}>CHOOSE YOUR CLASS</PixelHeader>
      <div
        style={{
          fontFamily: "'Courier Prime', monospace",
          fontSize: 12,
          color: RPG.textDim,
          marginTop: -8,
        }}
      >
        Your class shapes your learning style and abilities.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CLASSES.map((cls) => {
          const sel = selected === cls.id;
          return (
            <div
              key={cls.id}
              onClick={() => setSelected(cls.id)}
              style={{
                ...pixelBorderStyle(
                  sel ? cls.color : RPG.border,
                  sel ? `${cls.color}22` : RPG.panel,
                ),
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'all 0.12s',
                transform: sel ? 'scale(1.01)' : 'scale(1)',
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <CharSprite classType={cls.id} size={52} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Press Start 2P'",
                        fontSize: 11,
                        color: sel ? cls.color : RPG.gold,
                      }}
                    >
                      {cls.name}
                    </div>
                    <div
                      style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: RPG.textDim }}
                    >
                      {cls.kanji}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Courier Prime', monospace",
                      fontSize: 11,
                      color: RPG.textDim,
                      marginBottom: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    {cls.desc}
                  </div>
                  <MiniStatBar label={cls.stat1.label} val={cls.stat1.val} color={cls.color} />
                  <MiniStatBar label={cls.stat2.label} val={cls.stat2.val} color={cls.color} />
                  {sel && (
                    <div
                      style={{
                        fontFamily: "'Press Start 2P'",
                        fontSize: 7,
                        color: cls.color,
                        marginTop: 6,
                        textShadow: `0 0 8px ${cls.color}66`,
                      }}
                    >
                      ✦ {cls.ability}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <PixelButton
        onClick={() => selected && onPick(selected)}
        disabled={!selected}
        style={{ width: '100%', marginTop: 4 }}
        variant="green"
      >
        ▶ CONFIRM CLASS
      </PixelButton>
    </div>
  );
}

export function OnboardingName({
  classType,
  onComplete,
}: {
  classType: ClassType;
  onComplete: (hero: Hero) => void;
}) {
  const [name, setName] = useState('');
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 20px',
        gap: 20,
        background: radialBg,
      }}
    >
      <PixelHeader size={14}>NAME YOUR HERO</PixelHeader>

      <PixelPanel
        gold
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
      >
        <CharSprite classType={classType} size={72} />
        <div style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: RPG.textDim }}>
          HERO AWAITS A NAME
        </div>
      </PixelPanel>

      <PixelPanel>
        <div
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: 9,
            color: RPG.textDim,
            marginBottom: 10,
          }}
        >
          YOUR HERO NAME:
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={14}
          placeholder="Enter name..."
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#0a0a14',
            border: `2px solid ${RPG.border}`,
            color: RPG.text,
            fontFamily: "'Press Start 2P'",
            fontSize: 11,
            padding: '10px 12px',
            outline: 'none',
            boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.5)',
          }}
        />
        <div
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: 7,
            color: RPG.textDim,
            marginTop: 8,
            textAlign: 'right',
          }}
        >
          {name.length}/14
        </div>
      </PixelPanel>

      <PixelButton
        onClick={() =>
          name.trim().length > 1 &&
          onComplete({ name: name.trim(), classType, equipment: EMPTY_EQUIPMENT })
        }
        disabled={name.trim().length < 2}
        style={{ width: '100%' }}
        variant="green"
      >
        ✦ START QUEST
      </PixelButton>
    </div>
  );
}
