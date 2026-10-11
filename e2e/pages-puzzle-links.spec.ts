import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {solve} from './puzzle-helpers';
test('Pages base resolves a shared fragment in a fresh context with no rewrite',async({browser})=>{
 test.setTimeout(60000);
 const root=resolve('artifacts/family-pilot/pages-dist');
 execFileSync('npm',['exec','--','vite','build','--base=/starleap/','--outDir',root],{cwd:process.cwd(),stdio:'pipe'});
 const mime:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
 const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url!,'http://localhost').pathname;
  if(!pathname.startsWith('/starleap/')){res.writeHead(404).end();return;}
  const relative=decodeURIComponent(pathname.slice('/starleap/'.length))||'index.html';const file=resolve(root,relative);
  if(!file.startsWith(root+'/')){res.writeHead(404).end();return;}
  try{const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'}).end(body);}catch{res.writeHead(404).end();}
 });
 await new Promise<void>((ok,no)=>{server.once('error',no);server.listen(4275,'127.0.0.1',ok);});
 const context=await browser.newContext();const friend=await browser.newContext();
 try{
  const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const urls:string[]=[];page.on('request',r=>urls.push(r.url()));
  await page.goto('http://127.0.0.1:4275/starleap/#puzzle=first-chain&v=1');await solve(page);
  const text=await page.getByRole('textbox').inputValue();const link=text.match(/https?:\S+/)![0];expect(link).toBe('http://127.0.0.1:4275/starleap/#puzzle=first-chain&v=1');
  const second=await friend.newPage();await second.goto(link);await second.reload();await solve(second);
  expect(errors).toEqual([]);expect(urls.filter(url=>!url.startsWith('http://127.0.0.1:4275/starleap/')&&!url.startsWith('blob:'))).toEqual([]);
 }finally{await context.close();await friend.close();await new Promise<void>((ok,no)=>server.close(e=>e?no(e):ok()));}
});
