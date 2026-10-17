import {expect,it,vi,afterEach} from 'vitest';
import {createHmac} from 'node:crypto';
import {HmacBillingAdapter} from './billing';
afterEach(()=>vi.useRealTimers());
it('verifies signed events and rejects modified, stale or malformed requests',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
 const timestamp=Math.floor(Date.now()/1000);const secret='local-test-signature-secret';const adapter=new HmacBillingAdapter(secret);
 const body=JSON.stringify({id:'event-1',userId:'84000000-0000-4000-8000-000000000001',feature:'shared-room-access',enabled:true,validUntil:null});
 const signature=`${timestamp}.${createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex')}`;
 expect(adapter.verifyWebhook(body,signature).id).toBe('event-1');
 expect(()=>adapter.verifyWebhook(body+' ',signature)).toThrow();expect(()=>adapter.verifyWebhook(body,'invalid')).toThrow();
 vi.advanceTimersByTime(301000);expect(()=>adapter.verifyWebhook(body,signature)).toThrow();
});
