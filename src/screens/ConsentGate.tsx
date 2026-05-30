import { RPG, PixelPanel, PixelHeader, PixelButton } from '../components/rpg';

interface ConsentGateProps {
  onAnswer: (consent: boolean) => void;
}

export default function ConsentGate({ onAnswer }: ConsentGateProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 20px',
        gap: 18,
        background: `radial-gradient(ellipse at center, #1e2a4a 0%, ${RPG.bg} 70%)`,
        overflowY: 'auto',
      }}
    >
      <PixelHeader size={12}>HELP TUNE THE GAME</PixelHeader>

      <PixelPanel style={{ width: '100%' }}>
        <div
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 13,
            color: RPG.text,
            lineHeight: 1.6,
            marginBottom: 12,
          }}
        >
          Send anonymous play data so we can tune balance, difficulty, and
          progression?
        </div>
        <div
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 11,
            color: RPG.textDim,
            lineHeight: 1.5,
          }}
        >
          We never collect your name, email, portrait, or lesson answers — only
          event counts and timing. The game plays the same either way, and you
          can change your mind later from your profile.
        </div>
      </PixelPanel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PixelButton
          onClick={() => onAnswer(true)}
          sound="confirm"
          variant="green"
          style={{ width: '100%' }}
        >
          ✓ YES, SEND ANONYMOUS DATA
        </PixelButton>
        <PixelButton
          onClick={() => onAnswer(false)}
          sound="confirm"
          variant="grey"
          style={{ width: '100%' }}
        >
          ✗ NO THANKS
        </PixelButton>
      </div>
    </div>
  );
}
