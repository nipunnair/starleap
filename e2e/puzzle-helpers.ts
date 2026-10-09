import { expect, type Page } from '@playwright/test';
import { PUZZLES } from '../src/progression/puzzles';
import { key } from '../src/engine/coords';
export async function openPuzzle(page:Page,id='first-chain') { await page.goto(`/#puzzle=${id}&v=1`); await expect(page.getByTestId('puzzle-screen')).toBeVisible(); }
export async function moveTo(page:Page,cell:string,count:number) {
 await page.locator(`circle[data-cell="${cell}"]`).last().click();
 await expect(page.getByTestId('puzzle-counter')).toContainText(`Moves ${count} ·`);
}
export async function solve(page:Page,id='first-chain') { const p=PUZZLES.find(p=>p.id===id)!; for (let i=0;i<p.reference.length;i++) await moveTo(page,key(p.reference[i]!),i+1); await expect(page.getByTestId('puzzle-complete')).toBeVisible(); }
