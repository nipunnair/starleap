import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {openPuzzle} from './puzzle-helpers';
for(const width of [360,1280]) test(`puzzle keyboard, hints off, reduced motion and axe at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('starleap.settings.v1',JSON.stringify({showMoveHints:false,reducedMotion:'on'})));
 await openPuzzle(page);await expect(page.locator('circle[stroke="#50c88c"]')).toHaveCount(0);
 await page.getByRole('group',{name:/STARLEAP board/}).focus();
 for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
 await expect(page.getByTestId('puzzle-complete')).toBeVisible();
 for(const name of ['complete','picker','confirm']){
  if(name==='picker')await page.getByRole('button',{name:'Back to puzzles'}).click();
  if(name==='confirm')await page.getByRole('button',{name:'Long Leap',exact:true}).click();
  const result=await new AxeBuilder({page}).analyze();expect(result.violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`artifacts/family-pilot/resume/puzzle-${name}-${width}.png`,fullPage:true});
 }
 expect(errors).toEqual([]);
});
