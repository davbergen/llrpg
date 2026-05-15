import { useEffect, useState } from 'react';
import { PixelHeader, PixelButton, RPG, pixelBorderStyle } from '../components/rpg';
import { useAuth } from '../auth';
import {
  cancelDeletion,
  downloadExport,
  fetchScheduledDeletion,
  scheduleDeletion,
  type ScheduledDeletion,
} from '../gdpr';
import Terms from '../pages/Terms';
import Privacy from '../pages/Privacy';

type Modal = null | 'terms' | 'privacy' | 'confirm-delete';

export default function AccountSection() {
  const auth = useAuth();
  const userId = auth.status === 'signed-in' ? auth.user.id : null;
  const userEmail = auth.status === 'signed-in' ? auth.user.email : null;

  const [scheduled, setScheduled] = useState<ScheduledDeletion | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [busy, setBusy] = useState<null | 'export' | 'delete' | 'cancel'>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchScheduledDeletion(userId)
      .then((s) => {
        if (!cancelled) setScheduled(s);
      })
      .catch(() => {
        /* silent — banner just won't show */
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (modal === 'terms') return <Terms onClose={() => setModal(null)} />;
  if (modal === 'privacy') return <Privacy onClose={() => setModal(null)} />;

  const onExport = async () => {
    setBusy('export');
    setError(null);
    try {
      await downloadExport();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  const onConfirmDelete = async () => {
    setBusy('delete');
    setError(null);
    try {
      const s = await scheduleDeletion();
      setScheduled(s);
      setModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete request failed');
    } finally {
      setBusy(null);
    }
  };

  const onCancelDelete = async () => {
    setBusy('cancel');
    setError(null);
    try {
      await cancelDeletion();
      setScheduled(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ padding: '14px 16px', borderTop: `3px solid ${RPG.border}` }}>
      <PixelHeader size={9}>ACCOUNT</PixelHeader>

      {userEmail && (
        <div
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 11,
            color: RPG.textDim,
            marginBottom: 8,
          }}
        >
          {userEmail}
        </div>
      )}

      {scheduled && (
        <div
          style={{
            ...pixelBorderStyle(RPG.red, '#2a0a0a'),
            padding: 10,
            marginBottom: 10,
            fontFamily: "'Courier Prime', monospace",
            fontSize: 11,
            color: RPG.text,
            lineHeight: 1.5,
          }}
        >
          Account scheduled for deletion at{' '}
          <b>{new Date(scheduled.run_after).toLocaleString()}</b>. Cancel below to keep your data.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <PixelButton
          onClick={onExport}
          variant="blue"
          disabled={!userId || busy !== null}
          small
        >
          {busy === 'export' ? 'EXPORTING…' : '⬇ DOWNLOAD MY DATA'}
        </PixelButton>

        {scheduled ? (
          <PixelButton
            onClick={onCancelDelete}
            variant="green"
            disabled={busy !== null}
            small
          >
            {busy === 'cancel' ? 'CANCELLING…' : '↩ CANCEL DELETION'}
          </PixelButton>
        ) : (
          <PixelButton
            onClick={() => setModal('confirm-delete')}
            variant="red"
            disabled={!userId || busy !== null}
            small
          >
            ✖ DELETE MY ACCOUNT
          </PixelButton>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <PixelButton
            onClick={() => setModal('terms')}
            variant="grey"
            small
            style={{ flex: 1 }}
          >
            TERMS
          </PixelButton>
          <PixelButton
            onClick={() => setModal('privacy')}
            variant="grey"
            small
            style={{ flex: 1 }}
          >
            PRIVACY
          </PixelButton>
        </div>
      </div>

      {error && (
        <div
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 10,
            color: RPG.red,
            marginTop: 8,
          }}
        >
          {error}
        </div>
      )}

      {modal === 'confirm-delete' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 200,
          }}
        >
          <div
            style={{
              ...pixelBorderStyle(RPG.red, RPG.panel),
              width: '100%',
              maxWidth: 320,
              padding: 16,
            }}
          >
            <PixelHeader size={11} color={RPG.red}>
              DELETE ACCOUNT?
            </PixelHeader>
            <div
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: 12,
                color: RPG.text,
                lineHeight: 1.5,
                margin: '10px 0 14px',
              }}
            >
              This schedules a permanent deletion of your hero, cards, inventory, and all other
              account data in <b>24 hours</b>. You can cancel any time before then by signing back
              in and tapping <i>Cancel deletion</i>.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <PixelButton
                onClick={onConfirmDelete}
                variant="red"
                disabled={busy !== null}
                style={{ width: '100%' }}
              >
                {busy === 'delete' ? 'SCHEDULING…' : 'YES, DELETE IN 24H'}
              </PixelButton>
              <PixelButton
                onClick={() => setModal(null)}
                variant="grey"
                disabled={busy !== null}
                style={{ width: '100%' }}
              >
                CANCEL
              </PixelButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
