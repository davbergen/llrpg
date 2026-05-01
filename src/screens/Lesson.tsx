import React, { useState } from 'react';
import type { ScreenProps } from '../types';
import { RPG, pixelBorderStyle, PixelPanel, PixelHeader, PixelButton } from '../components/rpg';

interface MultipleChoiceQ {
  type: 'multiple_choice';
  question: string;
  jp: string;
  reading: string;
  options: string[];
  answer: string;
  xp: number;
  gold: number;
}

interface FillBlankQ {
  type: 'fill_blank';
  question: string;
  sentence: string;
  hint: string;
  answer: string;
  alt_answers?: string[];
  romaji: string;
  xp: number;
  gold: number;
}

interface MatchingPair {
  jp: string;
  en: string;
}

interface MatchingQ {
  type: 'matching';
  question: string;
  pairs: MatchingPair[];
  xp: number;
  gold: number;
}

type LessonQuestion = MultipleChoiceQ | FillBlankQ | MatchingQ;

const LESSON_DATA: LessonQuestion[] = [
  {
    type: 'multiple_choice',
    question: 'What does this mean?',
    jp: '猫',
    reading: 'ねこ (neko)',
    options: ['Dog', 'Cat', 'Bird', 'Fish'],
    answer: 'Cat',
    xp: 20,
    gold: 5,
  },
  {
    type: 'fill_blank',
    question: 'Complete the sentence:',
    sentence: '私は＿＿＿が好きです。',
    hint: 'I like ___ (sushi)',
    answer: 'すし',
    alt_answers: ['寿司', 'sushi'],
    romaji: 'sushi = すし',
    xp: 25,
    gold: 6,
  },
  {
    type: 'matching',
    question: 'Match the pairs!',
    pairs: [
      { jp: '犬', en: 'Dog' },
      { jp: '魚', en: 'Fish' },
      { jp: '花', en: 'Flower' },
      { jp: '山', en: 'Mountain' },
    ],
    xp: 30,
    gold: 8,
  },
  {
    type: 'multiple_choice',
    question: 'What does this mean?',
    jp: '食べる',
    reading: 'たべる (taberu)',
    options: ['To sleep', 'To eat', 'To run', 'To drink'],
    answer: 'To eat',
    xp: 20,
    gold: 5,
  },
  {
    type: 'fill_blank',
    question: 'Complete the sentence:',
    sentence: 'おはよう＿＿＿＿＿＿。',
    hint: 'Good morning (polite)',
    answer: 'ございます',
    alt_answers: ['gozaimasu'],
    romaji: 'ohayou gozaimasu',
    xp: 25,
    gold: 6,
  },
];

type Phase = 'question' | 'feedback' | 'complete';

const Lesson: React.FC<ScreenProps> = ({ gameState, setGameState, setScreen }) => {
  void gameState;
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const [, setSelectedOption] = useState<string | null>(null);
  const [fillAnswer, setFillAnswer] = useState('');
  const [matchLeft, setMatchLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<MatchingPair[]>([]);
  const [wrongPair, setWrongPair] = useState<{ left: string; right: string } | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [totalXp, setTotalXp] = useState(0);
  const [totalGold, setTotalGold] = useState(0);
  const [lives, setLives] = useState(3);
  const [shake, setShake] = useState(false);

  const current = LESSON_DATA[qIndex];
  const totalQ = LESSON_DATA.length;
  const progress = qIndex / totalQ;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const checkMultipleChoice = (opt: string) => {
    if (current.type !== 'multiple_choice') return;
    setSelectedOption(opt);
    const correct = opt === current.answer;
    setIsCorrect(correct);
    if (!correct) {
      setLives((l) => Math.max(0, l - 1));
      triggerShake();
    } else {
      setTotalXp((x) => x + current.xp);
      setTotalGold((g) => g + current.gold);
    }
    setPhase('feedback');
  };

  const checkFillBlank = () => {
    if (current.type !== 'fill_blank') return;
    const ans = fillAnswer.trim().toLowerCase();
    const correct = [current.answer, ...(current.alt_answers ?? [])]
      .map((a) => a.toLowerCase())
      .includes(ans);
    setIsCorrect(correct);
    if (!correct) {
      setLives((l) => Math.max(0, l - 1));
      triggerShake();
    } else {
      setTotalXp((x) => x + current.xp);
      setTotalGold((g) => g + current.gold);
    }
    setPhase('feedback');
  };

  const handleMatchSelect = (side: 'left' | 'right', value: string) => {
    if (current.type !== 'matching') return;
    if (side === 'left') {
      setMatchLeft(value);
    } else {
      if (matchLeft === null) return;
      const pair = current.pairs.find((p) => p.jp === matchLeft && p.en === value);
      if (pair) {
        const newMatched = [...matchedPairs, pair];
        setMatchedPairs(newMatched);
        setMatchLeft(null);
        if (newMatched.length === current.pairs.length) {
          setIsCorrect(true);
          setTotalXp((x) => x + current.xp);
          setTotalGold((g) => g + current.gold);
          setTimeout(() => setPhase('feedback'), 600);
        }
      } else {
        setWrongPair({ left: matchLeft, right: value });
        setLives((l) => Math.max(0, l - 1));
        triggerShake();
        setTimeout(() => {
          setWrongPair(null);
          setMatchLeft(null);
        }, 600);
      }
    }
  };

  const nextQuestion = () => {
    if (qIndex + 1 >= totalQ) {
      setGameState((gs) => ({
        ...gs,
        xp: Math.min(gs.maxXp, gs.xp + totalXp + current.xp),
        gold: gs.gold + totalGold,
        streak: gs.streak,
        questProgress: {
          ...gs.questProgress,
          daily1: Math.min(10, (gs.questProgress.daily1 ?? 0) + 5),
          daily2: Math.min(5, (gs.questProgress.daily2 ?? 0) + 3),
        },
      }));
      setPhase('complete');
    } else {
      setQIndex((q) => q + 1);
      setPhase('question');
      setSelectedOption(null);
      setFillAnswer('');
      setMatchLeft(null);
      setMatchedPairs([]);
    }
  };

  if (phase === 'complete')
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
          QUEST
          <br />
          COMPLETE!
        </div>
        <div style={{ fontSize: 48 }}>🎉</div>
        <PixelPanel gold style={{ width: '100%' }}>
          <PixelHeader size={10}>REWARDS EARNED</PixelHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: RPG.text }}>
                Experience
              </span>
              <span style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: RPG.gold }}>
                +{totalXp} XP
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: RPG.text }}>
                Gold
              </span>
              <span style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: '#f0c030' }}>
                +{totalGold} 💰
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: RPG.text }}>
                Accuracy
              </span>
              <span
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: 12,
                  color: lives > 1 ? RPG.green : RPG.red,
                }}
              >
                {lives === 3 ? '100%' : lives === 2 ? '80%' : '60%'}
              </span>
            </div>
            {lives === 3 && (
              <div
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: 8,
                  color: RPG.gold,
                  textAlign: 'center',
                  marginTop: 4,
                }}
              >
                ✦ PERFECT STREAK BONUS! ✦
              </div>
            )}
          </div>
        </PixelPanel>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <PixelButton onClick={() => setScreen('loot')} variant="green" style={{ flex: 1 }}>
            🎁 CLAIM LOOT
          </PixelButton>
          <PixelButton onClick={() => setScreen('home')} variant="grey" style={{ flex: 1 }}>
            🏠 HOME
          </PixelButton>
        </div>
      </div>
    );

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '14px 14px',
        gap: 14,
        animation: shake ? 'shake 0.4s ease' : 'none',
      }}
    >
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes popIn {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: RPG.textDim }}>
          {qIndex + 1}/{totalQ}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ fontSize: 16, opacity: i < lives ? 1 : 0.2 }}>
              ❤️
            </span>
          ))}
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

      <PixelPanel gold style={{ textAlign: 'center', animation: 'popIn 0.2s ease' }}>
        <div
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: 8,
            color: RPG.textDim,
            marginBottom: 8,
          }}
        >
          {current.question}
        </div>
        {current.type === 'multiple_choice' && (
          <>
            <div
              style={{
                fontFamily: "'Press Start 2P'",
                fontSize: 36,
                color: RPG.text,
                margin: '12px 0',
                textShadow: `0 0 20px ${RPG.gold}66`,
              }}
            >
              {current.jp}
            </div>
            <div
              style={{ fontFamily: "'Courier Prime', monospace", fontSize: 12, color: RPG.textDim }}
            >
              {current.reading}
            </div>
          </>
        )}
        {current.type === 'fill_blank' && (
          <>
            <div
              style={{
                fontFamily: "'Press Start 2P'",
                fontSize: 15,
                color: RPG.text,
                margin: '12px 0',
                lineHeight: 1.8,
              }}
            >
              {current.sentence}
            </div>
            <div
              style={{ fontFamily: "'Courier Prime', monospace", fontSize: 12, color: RPG.textDim }}
            >
              💡 {current.hint}
            </div>
          </>
        )}
        {current.type === 'matching' && (
          <div
            style={{ fontFamily: "'Courier Prime', monospace", fontSize: 12, color: RPG.textDim }}
          >
            Tap a Japanese word, then its English meaning
          </div>
        )}
      </PixelPanel>

      {phase !== 'feedback' && (
        <>
          {current.type === 'multiple_choice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {current.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => checkMultipleChoice(opt)}
                  style={{
                    ...pixelBorderStyle(RPG.border, RPG.panel),
                    padding: '14px 18px',
                    cursor: 'pointer',
                    fontFamily: "'Press Start 2P'",
                    fontSize: 11,
                    color: RPG.text,
                    textAlign: 'left',
                    border: `3px solid ${RPG.border}`,
                    transition: 'background 0.1s',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {current.type === 'fill_blank' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              <PixelPanel dark>
                <div
                  style={{
                    fontFamily: "'Press Start 2P'",
                    fontSize: 8,
                    color: RPG.textDim,
                    marginBottom: 8,
                  }}
                >
                  TYPE YOUR ANSWER:
                </div>
                <input
                  value={fillAnswer}
                  onChange={(e) => setFillAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fillAnswer.trim() && checkFillBlank()}
                  placeholder="Answer..."
                  autoFocus
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#0a0a14',
                    border: `2px solid ${RPG.border}`,
                    color: RPG.text,
                    fontFamily: "'Press Start 2P'",
                    fontSize: 13,
                    padding: '12px 14px',
                    outline: 'none',
                    boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.5)',
                    textAlign: 'center',
                  }}
                />
                <div
                  style={{
                    fontFamily: "'Press Start 2P'",
                    fontSize: 7,
                    color: RPG.textDim,
                    marginTop: 8,
                  }}
                >
                  Hint: {current.romaji}
                </div>
              </PixelPanel>
              <PixelButton
                onClick={checkFillBlank}
                disabled={!fillAnswer.trim()}
                style={{ width: '100%' }}
                variant="green"
              >
                ✓ CHECK ANSWER
              </PixelButton>
            </div>
          )}

          {current.type === 'matching' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      fontFamily: "'Press Start 2P'",
                      fontSize: 7,
                      color: RPG.textDim,
                      marginBottom: 2,
                      textAlign: 'center',
                    }}
                  >
                    日本語
                  </div>
                  {current.pairs.map((p) => {
                    const matched = matchedPairs.find((m) => m.jp === p.jp);
                    const selected = matchLeft === p.jp;
                    const isWrong = wrongPair?.left === p.jp;
                    return (
                      <button
                        key={p.jp}
                        onClick={() => !matched && handleMatchSelect('left', p.jp)}
                        style={{
                          padding: '12px 8px',
                          background: matched
                            ? '#1a3a1a'
                            : isWrong
                              ? '#3a1a1a'
                              : selected
                                ? '#1e2a4e'
                                : RPG.panelDark,
                          border: `3px solid ${matched ? RPG.green : isWrong ? RPG.red : selected ? RPG.blue : RPG.border}`,
                          color: matched
                            ? RPG.green
                            : isWrong
                              ? RPG.red
                              : selected
                                ? RPG.blue
                                : RPG.text,
                          fontFamily: "'Press Start 2P'",
                          fontSize: 16,
                          cursor: matched ? 'default' : 'pointer',
                          opacity: matched ? 0.6 : 1,
                          textDecoration: matched ? 'line-through' : 'none',
                          transition: 'all 0.1s',
                          boxShadow: selected ? `0 0 10px ${RPG.blue}66` : 'none',
                        }}
                      >
                        {p.jp}
                      </button>
                    );
                  })}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      fontFamily: "'Press Start 2P'",
                      fontSize: 7,
                      color: RPG.textDim,
                      marginBottom: 2,
                      textAlign: 'center',
                    }}
                  >
                    ENGLISH
                  </div>
                  {[...current.pairs]
                    .sort(() => Math.random() - 0.5)
                    .map((p) => {
                      const matched = matchedPairs.find((m) => m.en === p.en);
                      const isWrong = wrongPair?.right === p.en;
                      return (
                        <button
                          key={p.en}
                          onClick={() => !matched && matchLeft && handleMatchSelect('right', p.en)}
                          style={{
                            padding: '12px 8px',
                            background: matched ? '#1a3a1a' : isWrong ? '#3a1a1a' : RPG.panelDark,
                            border: `3px solid ${matched ? RPG.green : isWrong ? RPG.red : RPG.border}`,
                            color: matched ? RPG.green : isWrong ? RPG.red : RPG.text,
                            fontFamily: "'Courier Prime', monospace",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: matched ? 'default' : matchLeft ? 'pointer' : 'not-allowed',
                            opacity: matched ? 0.6 : !matchLeft && !matched ? 0.5 : 1,
                            textDecoration: matched ? 'line-through' : 'none',
                            transition: 'all 0.1s',
                          }}
                        >
                          {p.en}
                        </button>
                      );
                    })}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: 7,
                  color: RPG.textDim,
                  textAlign: 'center',
                }}
              >
                {matchedPairs.length}/{current.pairs.length} matched
              </div>
            </div>
          )}
        </>
      )}

      {phase === 'feedback' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            animation: 'popIn 0.2s ease',
          }}
        >
          <PixelPanel
            style={{
              borderColor: isCorrect ? RPG.green : RPG.red,
              background: isCorrect ? '#0a2a0a' : '#2a0a0a',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: "'Press Start 2P'",
                fontSize: 14,
                color: isCorrect ? RPG.green : RPG.red,
                textShadow: `0 0 16px ${isCorrect ? RPG.green : RPG.red}88`,
                marginBottom: 8,
              }}
            >
              {isCorrect ? '✓ CORRECT!' : '✗ WRONG!'}
            </div>
            {isCorrect ? (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: RPG.gold }}>
                  +{current.xp} XP
                </span>
                <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: '#f0c030' }}>
                  +{current.gold}💰
                </span>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    fontFamily: "'Press Start 2P'",
                    fontSize: 8,
                    color: RPG.textDim,
                    marginBottom: 4,
                  }}
                >
                  Correct answer:
                </div>
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: 11, color: RPG.text }}>
                  {current.type === 'multiple_choice'
                    ? current.answer
                    : current.type === 'fill_blank'
                      ? current.answer
                      : ''}
                </div>
              </div>
            )}
          </PixelPanel>
          <PixelButton
            onClick={nextQuestion}
            variant={isCorrect ? 'green' : 'gold'}
            style={{ width: '100%' }}
          >
            {qIndex + 1 >= totalQ ? '🎉 FINISH QUEST' : '▶ NEXT'}
          </PixelButton>
        </div>
      )}
    </div>
  );
};

export default Lesson;
