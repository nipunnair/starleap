import {test,expect} from '@playwright/test';
import {openPuzzle,moveTo,solve} from './puzzle-helpers';
test('reload restores move, undo and attempt identity',async({page})=>{await openPuzzle(page);await moveTo(page,'2,-2,0',1);const raw=await page.evaluate(()=>localStorage.getItem('starleap.save.v2'));await page.reload();await expect(page.getByTestId('puzzle-counter')).toContainText('Moves 1');expect(await page.evaluate(()=>localStorage.getItem('starleap.save.v2'))).toBe(raw);await page.getByRole('button',{name:'Undo',exact:true}).click();await page.reload();await solve(page);await expect(page.getByTestId('puzzle-complete')).toContainText('Try again');});
test('storage denial leaves puzzle playable',async({page})=>{await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error('quota');};});await openPuzzle(page);await solve(page);await expect(page.getByText('Progress could not be saved. You can keep playing.')).toBeVisible();});
test('interrupted animation cannot count or award an uncommitted move',async({page})=>{
 await openPuzzle(page);await page.getByTestId('cell-4,-4,0').click();await expect(page.getByTestId('animated-peg')).toBeVisible();
 await page.reload();await expect(page.getByTestId('puzzle-counter')).toContainText('Moves 0');
 expect(await page.evaluate(()=>localStorage.getItem('starleap.puzzle-awards.v1'))).toBeNull();await solve(page);
 await expect(page.getByTestId('puzzle-counter')).toContainText('Moves 1');
});
