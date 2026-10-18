import {expect,test} from '@playwright/test';
import {createLocalAccount} from './localAccount';
test('public Start creates one timer, lists on Home and copies a joining URL',async({page,browser})=>{
 test.setTimeout(180000);
 await page.route('**/api/rooms/token',route=>route.fulfill({status:503,json:{}}));
 await createLocalAccount(page,'Public session host');
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);
 const title=`Public reading ${crypto.randomUUID().slice(0,8)}`;
 await page.goto('/study');await page.getByLabel('Session title',{exact:true}).fill(title);
 await page.getByLabel('Session rules (optional)',{exact:true}).fill('Keep it calm.');
 await page.getByRole('radio',{name:'Public',exact:true}).check();
 const started=page.waitForResponse(response=>response.url().endsWith('/api/repository')&&response.request().postDataJSON()?.op==='start');
 await page.getByRole('button',{name:'Start',exact:true}).click();
 const startResponse=await started;expect(startResponse.status()).toBe(200);
 const startedSession=await startResponse.json();expect(startedSession.visibility).toBe('public');expect(startedSession.roomId).toMatch(/^[a-f0-9-]{36}$/);
 await expect(page).toHaveURL(/\/rooms\/[a-f0-9-]+$/,{timeout:15000});
 const roomUrl=page.url();
 const active=await page.request.post('/api/repository',{data:{op:'active'}});const before=await active.json();expect(before.title).toBe(title);
 await expect(page.getByRole('button',{name:'Hide companions',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Choose companions',exact:true}).click();
 const drawer=page.getByRole('dialog',{name:'Study companions',exact:true});
 await drawer.getByRole('button',{name:/Invite people to this session/}).click();
 await expect(drawer).toContainText('Link copied.');
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(roomUrl);
 await drawer.getByRole('button',{name:'Close',exact:true}).click();
 const guestContext=await browser.newContext();try{
  const guest=await guestContext.newPage();await guest.route('**/api/rooms/token',route=>route.fulfill({status:503,json:{}}));
  await createLocalAccount(guest,'Public session guest');
  const card=guest.getByRole('listitem').filter({has:guest.getByRole('heading',{name:title,exact:true})});await expect(card).toBeVisible();
  await card.getByRole('link',{name:'Join',exact:true}).click();await expect(guest).toHaveURL(roomUrl);
  await expect(guest.getByText('Keep it calm.',{exact:true})).toBeVisible();
 }finally{await guestContext.close();}
 const after=await page.request.post('/api/repository',{data:{op:'active'}});expect((await after.json()).startedAt).toBe(before.startedAt);
 await page.getByRole('button',{name:'Finish',exact:true}).click();await expect(page).toHaveURL(/\/complete$/);
});
