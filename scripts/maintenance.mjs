import {readFileSync} from "node:fs";
// Standalone development scheduler. Never print credentials or response bodies.
const environment={...process.env};
for(const line of readFileSync(new URL("../.env.local",import.meta.url),"utf8").split(/\r?\n/)){
 const match=line.match(/^([A-Z_]+)=(.*)$/);if(match&&!environment[match[1]])environment[match[1]]=match[2].trim().replace(/^["']|["']$/g,"");
}
if(!environment.CRON_SECRET)throw new Error("Set CRON_SECRET in .env.local to run local maintenance.");
let running=false;
async function tick(){if(running)return;running=true;try{const response=await fetch("http://localhost:3000/api/cron/study-leases",{headers:{Authorization:`Bearer ${environment.CRON_SECRET}`}});console.log(`Study maintenance: ${response.ok?"ok":"unavailable"}`);}catch{console.log("Study maintenance: app unavailable");}finally{running=false;}}
await tick();const interval=setInterval(()=>void tick(),60000);
for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>{clearInterval(interval);process.exit(0);});
