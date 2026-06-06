import React, { useMemo, useState } from 'react';
import type { ScreenName, ScreenProps } from '../types';
import { RPG, PixelPanel, PixelHeader, PixelButton, pixelBorderStyle } from '../components/rpg';
import {
  accuracy,
  answer,
  createLesson,
  currentQuestion,
  isComplete,
  summarize,
  type LessonState,
} from '../game/lesson-engine';
import type { SpineFace } from '../content/spine';

function facePromptHeader(face: SpineFace): string {
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
  }
}

function facePromptFontSize(face: SpineFace): number {
  // Sentence-style prompts (cloze) need to wrap; single-token prompts can be huge.
  if (face === 'cloze') return 14;
  if (face === 'reverse') return 22;
  return 36;
}
import { VOCAB_SPINE } from '../content/spine';
import { composeLesson } from '../game/lesson-composer';
import { applyOutcome, newCardState, type CardKey, type CardState } from '../game/fsrs-scheduler';
import { cardStore } from '../game/card-store-singleton';
import { containsJapanese } from '../game/text-script';
import { playSelect } from '../sfx';

const DEFAULT_QUESTION_COUNT = 5;

export interface LessonResult {
  accuracy: number;
  correctCount: number;
  totalCount: number;
  cardSnapshot: Array<[CardKey, CardState | null]>;
}

interface LessonProps extends ScreenProps {
  questionCount?: number;
  onComplete?: (result: LessonResult) => void;
  completeDestination?: ScreenName;
  completeLabel?: string;
}

type Phase = 'question' | 'feedback' | 'complete';

const Lesson: React.FC<LessonProps> = ({
  setScreen,
  questionCount = DEFAULT_QUESTION_COUNT,
  onComplete,
  completeDestination = 'home',
  completeLabel = '🏠 HOME',
}) => {
  const [{ state: initialState, cardSnapshot }] = useState<{
    state: LessonState;
    cardSnapshot: Array<[CardKey, CardState | null]>;
  }>(() => {
    const cards = composeLesson({
      spine: VOCAB_SPINE,
      store: cardStore,
      count: questionCount,
      now: Date.now(),
    });
    const snapshot = cards.map(
      (c) => [c.key, cardStore.get(c.key)] as [CardKey, CardState | null],
    );
    if (cards.length === 0) {
      return { state: createLesson({ pool: VOCAB_SPINE, questionCount }), cardSnapshot: [] };
    }
    return { state: createLesson({ pool: VOCAB_SPINE, questionCount, cards }), cardSnapshot: snapshot };
  });
  const [state, setState] = useState<LessonState>(initialState);
  const [phase, setPhase] = useState<Phase>('question');
  const [lastChoice, setLastChoice] = useState<string | null>(null);

  const q = currentQuestion(state);
  const total = state.questions.length;
  const answered = state.answers.length;
  const isLastQuestion = answered === total - 1;
  const progress = (answered + (phase === 'feedback' ? 1 : 0)) / total;
  const wasCorrect = phase === 'feedback' && q != null && lastChoice === q.correct;
  const finalAccuracy = useMemo(() => accuracy(state), [state]);

  const handleChoose = (choice: string) => {
    if (phase !== 'question' || !q) return;
    playSelect();
    setLastChoice(choice);
    setPhase('feedback');
  };

  const handleNext = () => {
    if (lastChoice === null || !q) return;
    const next = answer(state, lastChoice);
    setState(next);
    setLastChoice(null);
    if (isComplete(next)) {
      const summary = summarize(next);
      const now = Date.now();
      for (let i = 0; i < summary.cardIds.length; i++) {
        const key = summary.cardIds[i];
        const outcome = summary.ratings[i];
        const prior = cardStore.get(key) ?? newCardState(now);
        try {
          cardStore.set(key, applyOutcome(prior, outcome, now));
        } catch (err) {
          // One bad card must not blank the screen — log and reset it.
          console.error('FSRS scheduling failed for card', key, err);
          cardStore.set(key, applyOutcome(newCardState(now), outcome, now));
        }
      }
      const acc = summary.accuracy;
      const correctCount = next.answers.filter((a) => a.correct).length;
      // Render complete screen so the parent's transition fade always has visible content
      // — even if the parent's post-lesson flow stalls, we never end up showing a blank.
      setPhase('complete');
      if (onComplete) {
        // Parent owns the post-lesson flow (combat / loot routing).
        onComplete({
          accuracy: acc,
          correctCount,
          totalCount: next.questions.length,
          cardSnapshot,
        });
      }
      return;
    }
    setPhase('question');
  };

  if (phase === 'complete') {
    const pct = Math.round(finalAccuracy * 100);
    const correct = state.answers.filter((a) => a.correct).length;
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
          gap: 18,
          background: `radial-gradient(ellipse at center, #1e3a2a 0%, ${RPG.bg} 70%)`,
        }}
      >
        <div
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: 16,
            color: RPG.green,
            textShadow: `0 0 20px ${RPG.green}88`,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          LESSON
          <br />
          COMPLETE!
        </div>
        <PixelPanel gold style={{ width: '100%' }}>
          <PixelHeader size={10}>RESULTS</PixelHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Row label="Correct" value={`${correct} / ${total}`} color={RPG.text} />
            <Row
              label="Accuracy"
              value={`${pct}%`}
              color={pct >= 80 ? RPG.green : pct >= 50 ? RPG.gold : RPG.red}
            />
          </div>
        </PixelPanel>
        <PixelButton
          onClick={() => setScreen(completeDestination)}
          variant="grey"
          style={{ width: '100%' }}
        >
          {completeLabel}
        </PixelButton>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '14px 14px',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: RPG.textDim }}>
          {answered + 1}/{total}
        </div>
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
            width: `${progress * 100}%`,
            height: '100%',
            background: RPG.green,
            transition: 'width 0.4s ease',
            boxShadow: `0 0 8px ${RPG.green}88`,
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
          {facePromptHeader(q.face)}
        </div>
        <div
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: facePromptFontSize(q.face),
            color: RPG.text,
            margin: '12px 0',
            textShadow: `0 0 20px ${RPG.gold}66`,
            lineHeight: 1.4,
          }}
        >
          {q.prompt}
        </div>
        {q.promptSubtitle && (
          <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 12, color: RPG.textDim }}>
            {q.promptSubtitle}
          </div>
        )}
      </PixelPanel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {q.options.map((opt) => {
          const isFeedback = phase === 'feedback';
          const isChosen = isFeedback && opt === lastChoice;
          const isCorrectOption = isFeedback && opt === q.correct;
          let borderColor = RPG.border;
          let bg = RPG.panel;
          let color = RPG.text;
          if (isFeedback) {
            if (isCorrectOption) {
              borderColor = RPG.green;
              bg = '#0a2a0a';
              color = RPG.green;
            } else if (isChosen) {
              borderColor = RPG.red;
              bg = '#2a0a0a';
              color = RPG.red;
            }
          }
          // Japanese (kana/kanji) options render larger in the Japanese body
          // font — the pixel font has no kana glyphs and is illegible at 11px.
          // Romaji/English options keep the pixel styling for visual consistency.
          const isJp = containsJapanese(opt);
          return (
            <button
              key={opt}
              onClick={() => handleChoose(opt)}
              disabled={isFeedback}
              style={{
                ...pixelBorderStyle(borderColor, bg),
                padding: '14px 18px',
                cursor: isFeedback ? 'default' : 'pointer',
                fontFamily: isJp
                  ? "'Noto Sans JP', 'Courier Prime', sans-serif"
                  : "'Press Start 2P'",
                fontSize: isJp ? 22 : 11,
                fontWeight: isJp ? 700 : undefined,
                // Global CSS disables smoothing on `*`; re-enable it for kana/kanji.
                WebkitFontSmoothing: isJp ? 'antialiased' : 'none',
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
          sound={isLastQuestion ? 'confirm' : 'select'}
          variant={wasCorrect ? 'green' : 'gold'}
          style={{ width: '100%' }}
        >
          {isLastQuestion ? '🎉 FINISH' : '▶ NEXT'}
        </PixelButton>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: RPG.text }}>{label}</span>
    <span style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color }}>{value}</span>
  </div>
);

export default Lesson;
