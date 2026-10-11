import {test,expect} from '@playwright/test';
import {openPuzzle} from './puzzle-helpers';
test('unknown version falls back safely',async({page})=>{await page.goto('/#puzzle=first-chain&v=99');await expect(page.getByTestId('puzzle-picker')).toBeVisible();await expect(page.getByRole('status')).toContainText('newer build');});
test('deep link replacement requires consent and cancel preserves save',async({page})=>{await openPuzzle(page);const raw=await page.evaluate(()=>localStorage.getItem('starleap.save.v2'));await page.goto('/#puzzle=long-leap&v=1');await expect(page.getByTestId('confirm-discard-screen')).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(await page.evaluate(()=>localStorage.getItem('starleap.save.v2'))).toBe(raw);await page.goto('/#puzzle=long-leap&v=1');await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByRole('heading',{name:'Long Leap'})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'Long Leap'})).toBeVisible();});
test('normal match save survives rejected puzzle link and browser navigation',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Play vs Nova',exact:true}).click();
 await expect(page.getByTestId('game-screen')).toBeVisible();
 await page.locator('[data-testid^="peg-p0-"]').first().click();await page.locator('circle[stroke="#50c88c"]').first().click();
 await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('starleap.save.v2')!).snapshot.stats.lastEventSequence)).toBe(2);
 const raw=await page.evaluate(()=>localStorage.getItem('starleap.save.v2'));
 await page.goto('/#puzzle=first-chain&v=1');await expect(page.getByTestId('confirm-discard-screen')).toBeVisible();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('starleap.save.v2')!).snapshot)).toEqual(JSON.parse(raw!).snapshot);
 await expect(page.getByTestId('game-screen')).toBeVisible();
});
test('back and forward between puzzle fragments preserve the active attempt',async({page})=>{
 await openPuzzle(page);await page.goto('/#puzzle=long-leap&v=1');await expect(page.getByTestId('confirm-discard-screen')).toBeVisible();
 await page.goBack();await expect(page.getByRole('heading',{name:'First Chain',exact:true})).toBeVisible();
 await page.goForward();await expect(page.getByTestId('confirm-discard-screen')).toBeVisible();
});
