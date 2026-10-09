import {test,expect} from '@playwright/test';
import {openPuzzle,solve} from './puzzle-helpers';
for(const mode of ['native','copy','cancel','denied','missing']) test(`share ${mode}`,async({page,browser})=>{
 await page.addInitScript(mode=>{
 Object.defineProperty(navigator,'share',{configurable:true,value:mode==='native'?async()=>{}:mode==='cancel'?async()=>{throw new DOMException('cancel','AbortError');}:undefined});
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='missing'?undefined:{writeText:async()=>{if(mode==='denied') throw new Error('denied');}}});
 },mode);
 await openPuzzle(page);await solve(page);await page.getByRole('button',{name:'Challenge a friend'}).click();
 const status=mode==='native'?'Shared':mode==='copy'?'Copied challenge':mode==='cancel'?'Sharing cancelled':mode==='denied'?'Sharing unavailable. Select and copy the challenge below.':'Select and copy the challenge below.';
 await expect(page.getByText(status,{exact:true})).toBeVisible();const text=await page.getByRole('textbox').inputValue();expect(text).toContain('unverified');
 if(mode==='copy'){const context=await browser.newContext();const friend=await context.newPage();try{await friend.goto(text.match(/https?:\S+/)![0]);await solve(friend);}finally{await context.close();}}
});
