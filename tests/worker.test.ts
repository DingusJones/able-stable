import { afterEach,describe,expect,it,vi } from 'vitest';
import worker from '../worker/index';

describe('worker live catalog',()=>{
 afterEach(()=>vi.unstubAllGlobals());

 it('invokes provider fetches with the Worker global as their receiver',async()=>{
  const fetcher=vi.fn(function(this:unknown){
   if(this!==globalThis)throw new TypeError('Illegal invocation: function called with incorrect reference');
   return Promise.resolve(new Response('provider unavailable',{status:503}));
  });
  vi.stubGlobal('fetch',fetcher);

  const response=await worker.fetch(new Request('https://worker.test/v1/catalog?mode=core&chain=base&asset=usdc'),{DEMO_MODE:'false'});
  const body=await response.json() as {status:string;adapters:Array<{errors:Array<{message:string}>}>};

  expect(response.status).toBe(503);
  expect(body.status).toBe('unavailable');
  expect(fetcher).toHaveBeenCalledTimes(6);
  expect(body.adapters.flatMap(adapter=>adapter.errors).map(error=>error.message)).not.toContain('Illegal invocation: function called with incorrect reference');
 });
});
