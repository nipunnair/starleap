import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { newPuzzleSave, replayPuzzle, persistPuzzle, loadPuzzle, readPuzzleAwards } from '../puzzleStore';
import { PUZZLES, puzzleMoves } from '../../progression/puzzles';
import { key } from '../../engine/coords';
import { puzzleLink, parsePuzzleLink, challengeText } from '../puzzleSharing';
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
function solved() {
 const model = newPuzzleSave('first-chain');
 const move = puzzleMoves(PUZZLES[0]!, model.attempt).find(m => key(m.to) === '4,-4,0')!;
 model.save.actions.push({type:'move',move}); model.attempt = replayPuzzle(model.save); return model;
}
it('replays completion and undo exactly, retaining idempotent best awards', () => {
 const model=solved(); expect(persistPuzzle(model)).toBe(true); expect(JSON.stringify(loadPuzzle())).toBe(JSON.stringify(model));
 const raw=JSON.stringify(readPuzzleAwards()); expect(persistPuzzle(model)).toBe(true); expect(JSON.stringify(readPuzzleAwards())).toBe(raw);
 model.save.actions.push({type:'undo'}); model.attempt=replayPuzzle(model.save);
 expect(model.attempt).toMatchObject({moves:0,undoUsed:true,previous:null});
 expect(persistPuzzle(model)).toBe(true); expect(JSON.stringify(loadPuzzle())).toBe(JSON.stringify(model)); expect(JSON.stringify(readPuzzleAwards())).toBe(raw);
});
it.each(['{','{"kind":"puzzle","version":99}', '{"kind":"puzzle","version":1,"sessionId":"x","puzzleId":"missing","actions":[]}'])('rejects malformed active saves without overwriting them', raw => {
 localStorage.setItem('starleap.save.v2',raw); expect(loadPuzzle()).toBeNull(); expect(localStorage.getItem('starleap.save.v2')).toBe(raw);
});
it('preserves unreadable awards and durable completed attempt for recovery', () => {
 localStorage.setItem('starleap.puzzle-awards.v1','{"version":99}'); expect(persistPuzzle(solved())).toBe(false);
 expect(loadPuzzle()?.attempt.moves).toBe(1); expect(localStorage.getItem('starleap.puzzle-awards.v1')).toBe('{"version":99}');
});
it('handles quota failure and retries without duplicate awards', () => {
 const model=solved(); const spy=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota');});
 expect(persistPuzzle(model)).toBe(false); spy.mockRestore(); expect(persistPuzzle(model)).toBe(true);
 expect(readPuzzleAwards()).toEqual({'first-chain':{bestMoves:1,efficiency:true}});
});
it('rejects forged history', () => { const model=newPuzzleSave('first-chain'); model.save.actions.push({type:'undo'}); expect(()=>replayPuzzle(model.save)).toThrow(); });
it('validates fragments and preserves hosted bases while removing private file paths', () => {
 const p=PUZZLES[0]!; expect(parsePuzzleLink('#puzzle=first-chain&v=1')).toEqual({id:p.id});
 for(const hash of ['#puzzle=first-chain&v=2','#puzzle=%3Cscript%3E&v=1','#puzzle=missing&v=1']) expect(parsePuzzleLink(hash)).toBe('invalid');
 expect(puzzleLink(p,'https://example.org/starleap/?secret=yes')).toBe('https://example.org/starleap/#puzzle=first-chain&v=1');
 const text=challengeText(p,solved().attempt,'file:///private/user/starleap.html'); expect(text).toContain('https://nipunnair.github.io/starleap/#'); expect(text).not.toContain('private'); expect(text).not.toContain('4,-4');
});
