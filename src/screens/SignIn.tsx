import { useState } from 'react';
import { PixelPanel, PixelHeader, RPG, pixelBorderStyle } from '../components/rpg';
import { signInWithGoogle } from '../auth';

interface SignInProps {
  onSkip: () => void;
}

export default function SignIn({ onSkip }: SignInProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        gap: 18,
      }}
    >
      <PixelPanel gold style={{ width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <PixelHeader size={14}>SIGN IN</PixelHeader>
          <div
            style={{
              fontFamily: "'Courier Prime', monospace",
              fontSize: 11,
              color: RPG.text,
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Sign in with Google to save your progress across devices.
          </div>

          <button
            onClick={handleSignIn}
            disabled={busy}
            style={{
              ...pixelBorderStyle(RPG.gold, RPG.panelDark),
              padding: '10px 16px',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 9,
              color: RPG.gold,
              cursor: busy ? 'wait' : 'pointer',
              width: '100%',
            }}
          >
            {busy ? 'OPENING…' : '▶ CONTINUE WITH GOOGLE'}
          </button>

          {error && (
            <div
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: 10,
                color: RPG.red,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}
        </div>
      </PixelPanel>

      <button
        onClick={onSkip}
        style={{
          background: 'none',
          border: 'none',
          fontFamily: "'Courier Prime', monospace",
          fontSize: 11,
          color: RPG.textDim,
          textDecoration: 'underline',
          cursor: 'pointer',
          padding: 6,
        }}
      >
        Continue without account →
      </button>
    </div>
  );
}
