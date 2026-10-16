import {afterEach,expect,it,vi} from "vitest";
vi.mock("@/lib/community/livekitServer",()=>({livekitService:vi.fn()}));
import {GET} from "./route";
afterEach(()=>{vi.unstubAllEnvs();});
it("requires an exact configured secret before using service credentials",async()=>{
 vi.stubEnv("CRON_SECRET","configured-test-secret");expect((await GET(new Request("http://localhost/api/cron/study-leases"))).status).toBe(401);
 expect((await GET(new Request("http://localhost/api/cron/study-leases",{headers:{authorization:"Bearer wrong"}}))).status).toBe(401);
 vi.stubEnv("CRON_SECRET","");expect((await GET(new Request("http://localhost/api/cron/study-leases",{headers:{authorization:"Bearer "}}))).status).toBe(401);
});
