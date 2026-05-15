import LegalPage from './LegalPage';

const EFFECTIVE_DATE = '2026-05-15';

const sections = [
  {
    heading: 'WHAT WE COLLECT',
    body: 'When you sign in with Google we store your Google-provided email and a Supabase user id. As you play we store hero/character state, inventory, dungeon progress, spaced-repetition card state, lesson session summaries, gem-ledger entries, and any content reports you submit.',
  },
  {
    heading: 'HOW WE USE IT',
    body: 'Your data is used solely to run the app for you — saving progress across devices, scheduling card reviews, and surfacing content reports for review. We do not sell data and do not run third-party advertising trackers.',
  },
  {
    heading: 'WHO HAS ACCESS',
    body: 'Row-level security restricts each row to its owner. The project owner (david.bergendorff@gmail.com) has database-level access for maintenance and to review content reports. Supabase, our hosting provider, processes the data on our behalf.',
  },
  {
    heading: 'YOUR RIGHTS',
    body: 'You can download a JSON export of all your rows at any time from Profile → Account → Download my data. You can request account deletion from the same screen; deletion is held for 24 hours and can be cancelled by signing back in within that window. After 24 hours all rows owned by your account are hard-deleted and your auth user is removed.',
  },
  {
    heading: 'RETENTION',
    body: 'Data is retained as long as your account exists. Deleted accounts are removed within roughly 24 hours of confirmation. Backups containing deleted data roll off within 30 days.',
  },
  {
    heading: 'CHILDREN',
    body: 'The playtest is intended for adult learners. Do not create an account if you are under 13.',
  },
  {
    heading: 'CONTACT',
    body: 'Privacy questions: david.bergendorff@gmail.com',
  },
];

export default function Privacy({ onClose }: { onClose: () => void }) {
  return (
    <LegalPage
      title="PRIVACY POLICY"
      effectiveDate={EFFECTIVE_DATE}
      sections={sections}
      onClose={onClose}
    />
  );
}
