import {beforeEach,expect,it,vi} from "vitest";
const mock=vi.hoisted(()=>({identity:vi.fn(),upload:vi.fn()}));
vi.mock("@/lib/auth/server",()=>({createAuthClient:async()=>({auth:{getUser:mock.identity},storage:{from:()=>({upload:mock.upload})}})}));
import {POST} from "./route";
beforeEach(()=>{mock.identity.mockReset();mock.upload.mockReset();});
it("requires authentication before accepting attachments",async()=>{
 mock.identity.mockResolvedValue({data:{user:null},error:null});const response=await POST(new Request("http://localhost/api/community-media",{method:"POST"}));expect(response.status).toBe(401);expect(mock.upload).not.toHaveBeenCalled();
});
it("rejects disguised image bytes before writing storage",async()=>{
 mock.identity.mockResolvedValue({data:{user:{id:crypto.randomUUID()}},error:null});const form=new FormData();form.set("file",new File(["<script>"],"image.gif",{type:"image/gif"}));const response=await POST(new Request("http://localhost/api/community-media",{method:"POST",body:form}));expect(response.status).toBe(400);expect(mock.upload).not.toHaveBeenCalled();
});
