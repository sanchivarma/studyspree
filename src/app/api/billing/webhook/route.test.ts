import {afterEach,expect,it,vi} from 'vitest';
import {POST} from './route';
afterEach(()=>vi.unstubAllEnvs());
it('does not accept an unconfigured provider or pretend a payment succeeded',async()=>{
 vi.stubEnv('BILLING_PROVIDER','');const response=await POST(new Request('http://localhost/api/billing/webhook',{method:'POST',body:'{}'}));expect(response.status).toBe(503);
});
it('rejects invalid signatures before connecting to a billing worker',async()=>{
 vi.stubEnv('BILLING_PROVIDER','custom-hmac');vi.stubEnv('BILLING_WEBHOOK_SECRET','test-secret');
 const response=await POST(new Request('http://localhost/api/billing/webhook',{method:'POST',body:'{}',headers:{'x-studyspree-signature':'bad'}}));expect(response.status).toBe(400);
});
