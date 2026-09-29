import type { SessionStats } from '../../progression/sessionStats';
import type { ProgressCommit } from '../../app/progressStore';
import { CharacterAvatar } from './CharacterAvatar';

export function PersonalResults({ stats, result }: { stats: SessionStats; result?: ProgressCommit | null }) {
  const humans = stats.context.controllers.flatMap((seat, index) => seat === 'human' ? [index] : []);
  const human = humans.length === 1 ? stats.seats[humans[0]!] : null;
  const awards = result?.receipt?.awards;
  const failed = result && ['unavailable', 'corrupt', 'capacity', 'stale'].includes(result.status);
  return <section aria-label="Your match progress" data-testid="personal-results">
    {human && <p>Your moves: {human.moves} · Your longest chain: {human.longestChain} hops</p>}
    {!stats.historyComplete && <p>Earlier move history is unavailable. Statistics shown cover only recorded moves; this match cannot earn personal records or badges.</p>}
    {stats.undoUsed && <p>Undo used: this match cannot earn a best-win move record.</p>}
    {stats.context.mode !== 'standard' && <p>Practice matches do not earn personal records or rival badges.</p>}
    {failed && <p role="status">{result.status === 'stale' ? 'This older result is outside the retained award history.' : 'Local progress could not be saved.'} You can keep playing; no new saved award is claimed.</p>}
    {awards?.bestWinMoves && <p data-testid="new-best-moves">New personal best: fewest moves in a win!</p>}
    {awards?.bestChain && <p data-testid="new-best-chain">New personal best: your longest chain!</p>}
    {awards?.badge && <div data-testid="earned-badge"><CharacterAvatar tier={awards.badge} state="idle" size={64} /><p>Rival badge earned: {awards.badge}</p></div>}
    <p>Personal records and badges stay in this browser on this device.</p>
  </section>;
}
