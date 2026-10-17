import {test,expect} from '@playwright/test';
import {signIn} from './sessionFixtures';
test('preview feature drawers explain account mode and always close by button or Escape',async({page})=>{
 await signIn(page);
 for(const name of ['Search StudySpree','Notifications']){
  const trigger=page.getByRole('button',{name,exact:true});await trigger.click();
  const drawer=page.getByRole('dialog',{name,exact:true});await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('ss_admin');
  const close=drawer.getByRole('button',{name:'Close',exact:true});await expect(close).toBeVisible();
  const bounds=await close.boundingBox();expect(bounds!.width).toBeGreaterThanOrEqual(44);expect(bounds!.height).toBeGreaterThanOrEqual(44);
  await close.click();await expect(drawer).toHaveCount(0);await expect(trigger).toBeFocused();
  await trigger.click();await page.keyboard.press('Escape');await expect(drawer).toHaveCount(0);
 }
 await page.setViewportSize({width:375,height:667});
 await page.getByRole('button',{name:'Notifications',exact:true}).click();
 const drawer=page.getByRole('dialog',{name:'Notifications',exact:true});
 await drawer.getByRole('button',{name:'Close',exact:true}).click();await expect(drawer).toHaveCount(0);
});
