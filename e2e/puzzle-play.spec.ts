import { test,expect } from '@playwright/test';
import { PUZZLES } from '../src/progression/puzzles';
import { openPuzzle,solve,moveTo } from './puzzle-helpers';
for(const p of PUZZLES) test(`solve ${p.title}`,async({page})=>{await openPuzzle(page,p.id);await solve(page,p.id);await expect(page.getByTestId('puzzle-complete')).toContainText('efficiency star');});
test('completion beyond target, undo and retry remain positive',async({page})=>{
 await openPuzzle(page);await moveTo(page,'2,-2,0',1);await moveTo(page,'4,-4,0',2);
 await expect(page.getByTestId('puzzle-complete')).toContainText('Try again');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.getByTestId('puzzle-counter')).toContainText('Moves 1');
 await page.getByRole('button',{name:'Retry',exact:true}).click();await solve(page);await expect(page.getByTestId('puzzle-complete')).toContainText('efficiency star');
});
