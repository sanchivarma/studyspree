import {expect,test} from "@playwright/test";
import {createLocalAccount} from "./localAccount";
test("shared forms save real tasks, posts, groups and personal tile settings",async({page})=>{
 test.setTimeout(120000);const groupName=`Reading circle ${crypto.randomUUID().slice(0,8)}`;await createLocalAccount(page,"Form reader");
 await page.goto("/settings");
 await page.getByLabel("Mirror my preview",{exact:true}).uncheck();
 await page.getByLabel("Tile message",{exact:true}).fill("Reading chapter two");
 const tileSaved=page.waitForResponse(response=>new URL(response.url()).pathname==="/api/repository"&&response.request().postData()?.includes('"op":"updateTile"')===true&&response.request().postData()?.includes("Reading chapter two")===true);
 await page.getByRole("button",{name:"Update message",exact:true}).click();expect((await tileSaved).ok()).toBe(true);
 await page.reload();await expect(page.getByLabel("Mirror my preview",{exact:true})).not.toBeChecked();await expect(page.getByLabel("Tile message",{exact:true})).toHaveValue("Reading chapter two");
 await page.goto("/tasks");const taskForm=page.getByRole("form",{name:"Create",exact:true});
 await taskForm.getByLabel("Title",{exact:true}).fill("Read the next chapter");await taskForm.getByRole("button",{name:"Create",exact:true}).click();
 const task=page.getByRole("article").filter({has:page.getByRole("heading",{name:"Read the next chapter",exact:true})});await expect(task).toBeVisible();const taskSaved=page.waitForResponse(response=>new URL(response.url()).pathname==="/api/community"&&response.request().postData()?.includes('"action":"task.update"')===true);await task.getByLabel("Done",{exact:true}).check();expect((await taskSaved).ok()).toBe(true);await page.reload();await expect(page.getByLabel("Done",{exact:true})).toBeChecked();
 await page.goto("/feed");const postForm=page.getByRole("form",{name:"Send",exact:true});await postForm.getByLabel("Message or description",{exact:true}).fill("Focused reading today.");await postForm.getByRole("button",{name:"Send",exact:true}).click();await expect(page.locator("article p").filter({hasText:/^Focused reading today\.$/})).toBeVisible();
 await page.goto("/groups");const groupForm=page.getByRole("form",{name:"Create",exact:true});await groupForm.getByLabel("Title",{exact:true}).fill(groupName);await groupForm.getByLabel("Message or description",{exact:true}).fill("A quiet reading group");await groupForm.getByRole("button",{name:"Create",exact:true}).click();await expect(page.getByRole("heading",{name:groupName,exact:true})).toBeVisible();
 await page.getByRole("button",{name:"More",exact:true}).click();await expect(page.getByRole("link",{name:"Focus partners",exact:true})).toBeVisible();
});
