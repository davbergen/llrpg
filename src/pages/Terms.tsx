import LegalPage from './LegalPage';

const EFFECTIVE_DATE = '2026-05-15';

const sections = [
  {
    heading: 'CLOSED PLAYTEST',
    body: 'LinguaQuest is a closed playtest for Japanese-language learners invited by the project owner. Access may be revoked at any time. The service is provided as-is with no warranty and no guarantee of uptime, data retention, or feature stability.',
  },
  {
    heading: 'ACCEPTABLE USE',
    body: 'Use the app for your own language practice. Do not attempt to scrape content, reverse-engineer the API, share your account, or upload abusive material via the "report" feature.',
  },
  {
    heading: 'CONTENT',
    body: 'Lesson content is provided for educational use during the playtest. You retain no rights to redistribute it. Reports you file about cards are used to improve the deck and may be reviewed by the project owner.',
  },
  {
    heading: 'YOUR DATA',
    body: 'You can export or delete your data at any time from Profile → Account. Deletion is held for 24 hours so you can cancel by signing back in. See the Privacy Policy for what is stored.',
  },
  {
    heading: 'TERMINATION',
    body: 'The project owner may end the playtest, remove accounts, or shut down the service without notice. On shutdown a final export will be offered where reasonably practical.',
  },
  {
    heading: 'CONTACT',
    body: 'Questions: david.bergendorff@gmail.com',
  },
];

export default function Terms({ onClose }: { onClose: () => void }) {
  return (
    <LegalPage
      title="TERMS OF SERVICE"
      effectiveDate={EFFECTIVE_DATE}
      sections={sections}
      onClose={onClose}
    />
  );
}
