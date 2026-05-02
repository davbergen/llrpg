import React, { useMemo, useState } from 'react';
import type { ScreenProps } from '../types';
import { RPG, PixelPanel, PixelHeader, PixelButton, pixelBorderStyle } from '../components/rpg';
import {
  accuracy,
  answer,
  createLesson,
  currentQuestion,
  isComplete,
  type LessonState,
} from '../game/lesson-engine';
import { VOCAB_POOL } from '../game/vocab';

const DEFAULT_QUESTION_COUNT = 5;

interface LessonProps extends ScreenProps {
  questionCount?: number;
  onComplete?: (accuracy: number) => void;
}

type Phase = 'question' | 'feedback' | 'complete';

const Lesson: React.FC<LessonProps> = ({
  setScreen,
  questionCount = DEFAULT_QUESTION_COUNT,
  onComplete,
}) => {
  const [state, setState] = useState<LessonState>(() =>
    createLesson({ pool: VOCAB_POOL, questionCount }),
  );
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
    setLastChoice(choice);
    setPhase('feedback');
  };

  const handleNext = () => {
    if (lastChoice === null || !q) return;
    const next = answer(state, lastChoice);
    setState(next);
    setLastChoice(null);
    if (isComplete(next)) {
      const acc = accuracy(next);
      // Debug entry point — combat hookup is the next slice
      console.log('[lesson] complete; accuracy =', acc);
      onComplete?.(acc);
      setPhase('complete');
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
        <PixelButton onClick={() => setScreen('home')} variant="grey" style={{ width: '100%' }}>
          🏠 HOME
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
          What does this mean?
        </div>
        <div
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: 36,
            color: RPG.text,
            margin: '12px 0',
            textShadow: `0 0 20px ${RPG.gold}66`,
          }}
        >
          {q.jp}
        </div>
        <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 12, color: RPG.textDim }}>
          {q.romaji}
        </div>
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
