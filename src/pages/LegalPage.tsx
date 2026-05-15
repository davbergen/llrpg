import { PixelHeader, PixelButton, RPG } from '../components/rpg';

interface Section {
  heading: string;
  body: string;
}

interface LegalPageProps {
  title: string;
  effectiveDate: string;
  sections: Section[];
  onClose: () => void;
}

export default function LegalPage({ title, effectiveDate, sections, onClose }: LegalPageProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: RPG.bg,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 16px 8px',
          borderBottom: `2px solid ${RPG.border}`,
          background: RPG.panelDark,
        }}
      >
        <PixelHeader size={11}>{title}</PixelHeader>
        <div
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 10,
            color: RPG.textDim,
            marginTop: 4,
          }}
        >
          Effective {effectiveDate}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {sections.map((s) => (
          <div key={s.heading} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 9,
                color: RPG.gold,
                marginBottom: 8,
                lineHeight: 1.5,
              }}
            >
              {s.heading}
            </div>
            <div
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: 12,
                color: RPG.text,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {s.body}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px 16px', borderTop: `2px solid ${RPG.border}` }}>
        <PixelButton onClick={onClose} variant="grey" style={{ width: '100%' }}>
          CLOSE
        </PixelButton>
      </div>
    </div>
  );
}
