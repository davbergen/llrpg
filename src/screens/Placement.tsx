import { useMemo, useState } from 'react';
import { SPINE } from '../content/spine';
import {
  RPG,
  PixelPanel,
  PixelHeader,
  PixelButton,
  pixelBorderStyle,
} from '../components/rpg';
import { renderCard, deriveSeed, dayNumber } from '../game/card-renderer';
import {
  applyPlacementToStore,
  createPlacementSession,
  isPlacementComplete,
  MAX_QUESTIONS,
  pickNextEntry,
  placementFaceFor,
  recordOutcome,
  type PlacementSession,
} from '../game/placement';
import type { CardStore } from '../game/fsrs-scheduler';
import { playSelect } from '../sfx';

interface PlacementProps {
  onComplete: () => void;
  /** Injected card store — the single instance constructed at the app root. */
  cardStore: CardStore;
}

type Phase = 'intro' | 'probe' | 'feedback';

export default function Placement({ onComplete, cardStore }: PlacementProps) {
  const [session, setSession] = useState<PlacementSession>(() =>
    createPlacementSession(Date.now()),
  );
  const [phase, setPhase] = useState<Phase>('intro');
  const [choice, setChoice] = useState<string | null>(null);

  const currentEntry = useMemo(() => {
    if (phase === 'intro') return null;
    return pickNextEntry(session, SPINE);
  }, [phase, session]);

  const question = useMemo(() => {
    if (!currentEntry) return null;
    const face = placementFaceFor(currentEntry);
    return renderCard(currentEntry, face, SPINE, deriveSeed(currentEntry.id, dayNumber(Date.now())));
  }, [currentEntry]);

  const radialBg = `radial-gradient(ellipse at center, #2a1e3a 0%, ${RPG.bg} 70%)`;

  if (phase === 'intro') {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
          gap: 22,
          background: radialBg,
        }}
      >
        <div
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: 18,
            color: RPG.gold,
            textShadow: `0 0 24px ${RPG.gold}88`,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          AWAKENING
        </div>
        <PixelPanel gold style={{ width: '100%' }}>
          <div
            style={{
              fontFamily: "'Courier Prime', monospace",
              fontSize: 14,
              color: RPG.text,
              lineHeight: 1.7,
              textAlign: 'center',
            }}
          >
            Memories stir. Let&apos;s see what survives.
          </div>
        </PixelPanel>
        <div
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: 8,
            color: RPG.textDim,
            textAlign: 'center',
            lineHeight: 1.7,
          }}
        >
          A short probe — answer what you can. There is no score.
        </div>
        <PixelButton onClick={() => setPhase('probe')} style={{ width: '100%' }}>
          ▶ BEGIN
        </PixelButton>
        <PixelButton
          onClick={() => {
            applyPlacementToStore(session, cardStore, Date.now());
            onComplete();
          }}
          variant="gold"
          style={{ width: '100%', opacity: 0.6 }}
        >
          SKIP
        </PixelButton>
      </div>
    );
  }

  // No more candidates left, or we've hit the cap — finalize.
  if (!currentEntry || !question || isPlacementComplete(session)) {
    applyPlacementToStore(session, cardStore, Date.now());
    onComplete();
    return null;
  }

  const probedCount = session.probed.length;
  const progress = probedCount / MAX_QUESTIONS;
  const wasCorrect = phase === 'feedback' && choice === question.correct;

  const handleChoose = (opt: string) => {
    if (phase !== 'probe') return;
    playSelect();
    setChoice(opt);
    setPhase('feedback');
  };

  const handleNext = () => {
    if (choice === null) return;
    const outcome = choice === question.correct ? 'correct' : 'wrong';
    setSession((s) => recordOutcome(s, currentEntry, outcome));
    setChoice(null);
    setPhase('probe');
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '14px 14px',
        gap: 14,
        background: radialBg,
      }}
    >
      <PixelHeader size={11}>AWAKENING</PixelHeader>

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
            width: `${progress * 100}%`,
            height: '100%',
            background: RPG.gold,
            transition: 'width 0.4s ease',
            boxShadow: `0 0 8px ${RPG.gold}88`,
          }}
        />
      </div>

      <PixelPanel gold style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: 8,
            color: RPG.textDim,
            marginBottom: 8,
          }}
        >
          {facePromptHeader(question.face)}
        </div>
        <div
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: facePromptFontSize(question.face),
            color: RPG.text,
            margin: '12px 0',
            textShadow: `0 0 20px ${RPG.gold}66`,
            lineHeight: 1.4,
          }}
        >
          {question.prompt}
        </div>
        {question.promptSubtitle && (
          <div
            style={{ fontFamily: "'Courier Prime', monospace", fontSize: 12, color: RPG.textDim }}
          >
            {question.promptSubtitle}
          </div>
        )}
      </PixelPanel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {question.options.map((opt) => {
          const isFeedback = phase === 'feedback';
          const isChosen = isFeedback && opt === choice;
          const isCorrect = isFeedback && opt === question.correct;
          let borderColor = RPG.border;
          let bg = RPG.panel;
          let color = RPG.text;
          if (isFeedback) {
            if (isCorrect) {
              borderColor = RPG.green;
              bg = '#0a2a0a';
              color = RPG.green;
            } else if (isChosen) {
              borderColor = RPG.red;
              bg = '#2a0a0a';
              color = RPG.red;
            }
          }
          return (
            <button
              key={opt}
              onClick={() => handleChoose(opt)}
              disabled={isFeedback}
              style={{
                ...pixelBorderStyle(borderColor, bg),
                padding: '14px 18px',
                cursor: isFeedback ? 'default' : 'pointer',
                fontFamily: "'Press Start 2P'",
                fontSize: 11,
                color,
                textAlign: 'left',
                border: `3px solid ${borderColor}`,
                transition: 'background 0.1s',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {phase === 'feedback' && (
        <PixelButton
          onClick={handleNext}
          variant={wasCorrect ? 'green' : 'gold'}
          style={{ width: '100%' }}
        >
          ▶ NEXT
        </PixelButton>
      )}
    </div>
  );
}

function facePromptHeader(face: string): string {
  switch (face) {
    case 'recall':
      return 'What does this mean?';
    case 'reverse':
      return 'How do you say this?';
    case 'cloze':
      return 'Fill in the blank:';
    case 'meaning':
      return 'What does this kanji mean?';
    case 'reading':
      return 'How is this kanji read?';
    default:
      return '';
  }
}

function facePromptFontSize(face: string): number {
  if (face === 'cloze') return 14;
  if (face === 'reverse') return 22;
  return 36;
}
