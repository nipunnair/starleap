import { loadProgress } from './progressStore';
import { RIVALS } from '../progression/records';
import { CharacterAvatar } from '../ui/components/CharacterAvatar';

function comparisonLabel(key: string): string {
  try {
    const parts: unknown = JSON.parse(key);
    if (Array.isArray(parts)) return `Against ${parts[7]} · seat ${Number(parts[5]) + 1} · ${parts[8] ? 'cordoned' : 'open'} corners`;
  } catch { /* Preserve readable records even from an older comparison format. */ }
  return 'Previous rules';
}
export function ProgressScreen({ onBack }: { onBack: () => void }) {
  const loaded = loadProgress();
  return <main data-testid="progress-screen">
    <h1>Rival badges / Personal bests</h1>
    <p>Saved only in this browser on this device. Clearing browser data removes these records.</p>
    {loaded.status !== 'available' ? <p role="status">Local records are {loaded.status === 'corrupt' ? 'unreadable. Existing data has been preserved' : 'unavailable'}. You can still play.</p> : <>
      <h2>Rival badges</h2>
      <p>Earn a badge with your first completed win against each rival. Every rival is always available.</p>
      <ul className="rival-collection">
        {RIVALS.map(tier => <li key={tier} data-testid={`badge-${tier}`}>
          <CharacterAvatar tier={tier} state="idle" size={64} />
          <strong>{tier}</strong><span>{loaded.progress.badges.includes(tier) ? 'Earned' : 'Not yet earned'}</span>
        </li>)}
      </ul>
      <h2>Personal bests</h2>
      <p>Compared within the same rival, starting seat and rules. A changed game version starts a separate comparison.</p>
      {loaded.progress.records.length === 0 ? <p>Complete a solo match against a rival to start your collection.</p> :
        <ul>{loaded.progress.records.map(record => <li key={record.comparisonKey}>
          <strong>{comparisonLabel(record.comparisonKey)}</strong>: best win {record.bestWinMoves === null ? '—' : `${record.bestWinMoves} moves`}; longest chain {record.bestChain} hops.
        </li>)}</ul>}
    </>}
    <button className="btn btn-secondary" onClick={onBack}>Back to menu</button>
  </main>;
}
