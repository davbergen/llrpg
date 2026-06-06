import { useState } from 'react';
import type { ClassType, ScreenName } from '../../types';
import { playSfx, playSelect, type SfxName } from '../../sfx';

// --- Color tokens ---
export const RPG = {
  bg: '#1a1a2e',
  panel: '#16213e',
  panelDark: '#0f172a',
  border: '#c8860a',
  borderHi: '#e6a817',
  gold: '#e6a817',
  goldDim: '#a0680e',
  red: '#c44b4b',
  blue: '#4a9edd',
  green: '#4caf50',
  purple: '#9b5de5',
  text: '#f0e6c8',
  textDim: '#a09070',
  textDark: '#5a4e3a',
  orange: '#d97706',
};

// --- Pixel border via box-shadow (4 corner dots + border) ---
export const pixelBorderStyle = (color = RPG.border, bg = RPG.panel): React.CSSProperties => ({
  background: bg,
  border: `3px solid ${color}`,
  boxShadow: `
    0 0 0 1px ${RPG.bg},
    inset 0 0 0 1px rgba(0,0,0,0.4),
    3px 3px 0 0 ${RPG.panelDark},
    -1px -1px 0 0 rgba(255,255,255,0.05)
  `,
  imageRendering: 'pixelated',
});

// PixelPanel — the main card container
interface PixelPanelProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  gold?: boolean;
  dark?: boolean;
  className?: string;
}

export function PixelPanel({
  children,
  style,
  gold = false,
  dark = false,
  className = '',
}: PixelPanelProps) {
  const bg = dark ? RPG.panelDark : RPG.panel;
  const borderColor = gold ? RPG.gold : RPG.border;
  return (
    <div
      style={{
        ...pixelBorderStyle(borderColor, bg),
        padding: '16px',
        position: 'relative',
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  );
}

// PixelHeader — section title with pixel font + decorative line
interface PixelHeaderProps {
  children: React.ReactNode;
  color?: string;
  size?: number;
}

export function PixelHeader({ children, color = RPG.gold, size = 13 }: PixelHeaderProps) {
  return (
    <div
      style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: size,
        color,
        textShadow: `2px 2px 0 rgba(0,0,0,0.8), 0 0 12px ${color}44`,
        marginBottom: 12,
        letterSpacing: 1,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

// PixelButton
type ButtonVariant = 'gold' | 'green' | 'red' | 'grey' | 'blue';

interface PixelButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: React.CSSProperties;
  small?: boolean;
  /** Press sound. Defaults to 'select'; use 'confirm' for choice-committing buttons. */
  sound?: SfxName | 'none';
}

export function PixelButton({
  children,
  onClick,
  variant = 'gold',
  disabled = false,
  style = {},
  small = false,
  sound = 'select',
}: PixelButtonProps) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const variants: Record<
    ButtonVariant,
    { bg: string; border: string; shadow: string; text: string }
  > = {
    gold: {
      bg: pressed ? '#a0680e' : hovered ? '#f0b820' : '#c8860a',
      border: '#e6a817',
      shadow: '#7a4e08',
      text: '#1a1208',
    },
    green: {
      bg: pressed ? '#2d7a30' : hovered ? '#5dc460' : '#3d9e40',
      border: '#6be06e',
      shadow: '#1a4d1c',
      text: '#f0ffe0',
    },
    red: {
      bg: pressed ? '#8b2020' : hovered ? '#e05555' : '#c04040',
      border: '#e86060',
      shadow: '#5a1010',
      text: '#ffe0e0',
    },
    grey: {
      bg: pressed ? '#2a2a3a' : hovered ? '#3a3a4e' : '#2e2e42',
      border: '#5a5a7a',
      shadow: '#14141e',
      text: RPG.textDim,
    },
    blue: {
      bg: pressed ? '#2a5a8a' : hovered ? '#4aaeee' : '#3a8ecc',
      border: '#6ac8ff',
      shadow: '#1a3a5a',
      text: '#f0f8ff',
    },
  };
  const v = variants[variant];
  const pad = small ? '8px 14px' : '12px 22px';
  const fontSize = small ? 9 : 11;
  const handleClick = () => {
    if (disabled) return;
    if (sound !== 'none') playSfx(sound);
    onClick?.();
  };
  return (
    <button
      onClick={disabled ? undefined : handleClick}
      onMouseDown={() => {
        if (!disabled) setPressed(true);
      }}
      onMouseUp={() => setPressed(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize,
        color: disabled ? RPG.textDark : v.text,
        background: disabled ? '#2a2a3a' : v.bg,
        border: `3px solid ${disabled ? '#3a3a4a' : v.border}`,
        boxShadow: disabled
          ? 'none'
          : `3px 3px 0 ${v.shadow}, inset 0 1px 0 rgba(255,255,255,0.15)`,
        padding: pad,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transform: pressed ? 'translate(2px,2px)' : 'none',
        transition: 'background 0.08s',
        userSelect: 'none',
        letterSpacing: 1,
        lineHeight: 1.4,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// HP/XP/MP bar
interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: string;
}

export function StatBar({ label, value, max, color, icon }: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 3,
        }}
      >
        <span style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: RPG.textDim }}>
          {icon} {label}
        </span>
        <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: RPG.textDim }}>
          {value}/{max}
        </span>
      </div>
      <div
        style={{
          height: 14,
          background: '#0a0a14',
          border: `2px solid ${RPG.border}`,
          boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            background: `repeating-linear-gradient(90deg, ${color} 0px, ${color} 6px, ${color}bb 6px, ${color}bb 8px)`,
            transition: 'width 0.5s ease',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px)',
          }}
        />
      </div>
    </div>
  );
}

// XP progress bar (wider variant)
interface XPBarProps {
  xp: number;
  maxXp: number;
  level: number;
}

export function XPBar({ xp, maxXp, level }: XPBarProps) {
  const pct = (xp / maxXp) * 100;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: RPG.gold }}>
          LVL {level}
        </span>
        <span style={{ fontFamily: "'Press Start 2P'", fontSize: 7, color: RPG.textDim }}>
          {xp}/{maxXp} XP
        </span>
      </div>
      <div
        style={{
          height: 18,
          background: '#0a0a14',
          border: `2px solid ${RPG.gold}`,
          boxShadow: `0 0 8px ${RPG.gold}44, inset 2px 2px 0 rgba(0,0,0,0.5)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            background: `repeating-linear-gradient(90deg, ${RPG.gold} 0px, ${RPG.gold} 6px, ${RPG.goldDim} 6px, ${RPG.goldDim} 8px)`,
            transition: 'width 0.6s ease',
            boxShadow: `0 0 10px ${RPG.gold}88`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)',
          }}
        />
      </div>
    </div>
  );
}

// Streak flame badge
interface StreakBadgeProps {
  days: number;
}

export function StreakBadge({ days }: StreakBadgeProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        fontFamily: "'Press Start 2P'",
      }}
    >
      <div style={{ fontSize: 22, filter: 'drop-shadow(0 0 8px #ff6a00)' }}>🔥</div>
      <div style={{ fontSize: 10, color: '#ff9a3c', textShadow: '1px 1px 0 #000' }}>{days}</div>
      <div style={{ fontSize: 7, color: RPG.textDim }}>STREAK</div>
    </div>
  );
}

// Pixel art character sprite (CSS drawn)
interface CharSpriteProps {
  classType: ClassType;
  size?: number;
}

export function CharSprite({ classType, size = 64 }: CharSpriteProps) {
  const colors: Record<string, { robe: string; hat: string; skin: string; accent: string }> = {
    mage: { robe: '#7a3ca8', hat: '#5a2a88', skin: '#f4d0a0', accent: '#e6a817' },
    warrior: { robe: '#8b2020', hat: '#6b1818', skin: '#d4a070', accent: '#aaaaaa' },
    priest: { robe: '#e0d8b0', hat: '#c8b878', skin: '#f4d0a0', accent: '#f4e060' },
  };
  const c = colors[classType] ?? colors.mage;
  const s = size;
  return (
    <svg width={s} height={s * 1.4} viewBox="0 0 32 44" style={{ imageRendering: 'pixelated' }}>
      <rect x="10" y="2" width="12" height="3" fill={c.hat} />
      <rect x="8" y="5" width="16" height="2" fill={c.hat} />
      <rect x="10" y="7" width="12" height="10" fill={c.skin} />
      <rect x="12" y="11" width="2" height="2" fill="#1a1a2e" />
      <rect x="18" y="11" width="2" height="2" fill="#1a1a2e" />
      <rect x="13" y="14" width="6" height="1" fill="#c8795a" />
      <rect x="9" y="17" width="14" height="12" fill={c.robe} />
      <rect x="5" y="17" width="4" height="9" fill={c.robe} />
      <rect x="23" y="17" width="4" height="9" fill={c.robe} />
      <rect x="5" y="26" width="4" height="3" fill={c.skin} />
      <rect x="23" y="26" width="4" height="3" fill={c.skin} />
      <rect x="10" y="29" width="5" height="10" fill={c.hat} />
      <rect x="17" y="29" width="5" height="10" fill={c.hat} />
      <rect x="9" y="39" width="6" height="3" fill="#1a1a2e" />
      <rect x="17" y="39" width="6" height="3" fill="#1a1a2e" />
      <rect x="14" y="17" width="4" height="12" fill={c.accent} opacity="0.3" />
    </svg>
  );
}

// Item icon component
type ItemType = 'sword' | 'shield' | 'potion' | 'scroll' | 'helmet' | 'bow' | 'staff' | 'gem';

interface ItemIconProps {
  type: ItemType;
  size?: number;
}

export function ItemIcon({ type, size = 36 }: ItemIconProps) {
  const icons: Record<ItemType, { bg: string; fg: string }> = {
    sword: { bg: '#c0c0d0', fg: '#606070' },
    shield: { bg: '#8b6914', fg: '#c8a020' },
    potion: { bg: '#4a2080', fg: '#e040fb' },
    scroll: { bg: '#8b6914', fg: '#f4d860' },
    helmet: { bg: '#707080', fg: '#aaaacc' },
    bow: { bg: '#6b3a00', fg: '#c87020' },
    staff: { bg: '#4a2080', fg: '#8a50d0' },
    gem: { bg: '#0a3060', fg: '#40a0ff' },
  };
  const item = icons[type] ?? icons.sword;
  return (
    <div
      style={{
        width: size,
        height: size,
        background: item.bg,
        border: `2px solid ${RPG.border}`,
        boxShadow: `inset 1px 1px 0 rgba(255,255,255,0.2), 2px 2px 0 ${RPG.panelDark}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.55,
        imageRendering: 'pixelated',
      }}
    >
      {type === 'sword' && '⚔'}
      {type === 'shield' && '🛡'}
      {type === 'potion' && '🧪'}
      {type === 'scroll' && '📜'}
      {type === 'helmet' && '⛑'}
      {type === 'bow' && '🏹'}
      {type === 'staff' && '🪄'}
      {type === 'gem' && '💎'}
    </div>
  );
}

// Navigation tab bar
interface NavBarProps {
  screen: ScreenName;
  setScreen: (screen: ScreenName) => void;
}

export function NavBar({ screen, setScreen }: NavBarProps) {
  const tabs: Array<{ id: ScreenName; label: string; icon: string }> = [
    { id: 'home', label: 'HOME', icon: '🏰' },
    { id: 'dungeon', label: 'DUNGEON', icon: '⚔' },
    { id: 'shop', label: 'SHOP', icon: '🛒' },
    { id: 'profile', label: 'HERO', icon: '👤' },
  ];
  return (
    <div
      style={{
        display: 'flex',
        background: RPG.panelDark,
        borderTop: `3px solid ${RPG.border}`,
        boxShadow: `0 -3px 0 ${RPG.panelDark}`,
      }}
    >
      {tabs.map((tab) => {
        const active = screen === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => {
              playSelect();
              setScreen(tab.id);
            }}
            style={{
              flex: 1,
              padding: '10px 4px 8px',
              background: active ? RPG.panel : 'transparent',
              border: 'none',
              borderTop: active ? `3px solid ${RPG.gold}` : '3px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              transition: 'background 0.1s',
            }}
          >
            <span
              style={{ fontSize: 18, filter: active ? `drop-shadow(0 0 6px ${RPG.gold})` : 'none' }}
            >
              {tab.icon}
            </span>
            <span
              style={{
                fontFamily: "'Press Start 2P'",
                fontSize: 7,
                color: active ? RPG.gold : RPG.textDim,
                textShadow: active ? `0 0 8px ${RPG.gold}88` : 'none',
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
