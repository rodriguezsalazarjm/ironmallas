import {spawn} from "node:child_process";
import {setTimeout as delay} from "node:timers/promises";
const port=String(process.env.TEST_PORT||3199);
const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:"",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"",SUPABASE_SECRET_KEY:"",TEST_BASE_URL:`http://localhost:${port}`};
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--port",port],{env,stdio:["ignore","pipe","pipe"]});
let diagnostic="";server.stdout.on("data",d=>{diagnostic+=String(d);});server.stderr.on("data",d=>{diagnostic+=String(d);});
const stop=()=>server.kill();process.once("SIGINT",stop);process.once("SIGTERM",stop);
try{
  let ready=false;for(let attempt=0;attempt<100;attempt++){try{const response=await fetch(`${env.TEST_BASE_URL}/admin/login`);if(response.ok){ready=true;break;}}catch{}if(server.exitCode!==null)break;await delay(200);}
  if(!ready)throw new Error(`El servidor de pruebas no inició. ${diagnostic.slice(-1000)}`);
  const tests=spawn(process.execPath,["--import","tsx","--test","tests/routes.test.ts","tests/users-routes.test.ts"],{env,stdio:"inherit"});
  const code=await new Promise(resolve=>tests.once("exit",resolve));if(code!==0)process.exitCode=1;
}catch(error){console.error(error.message);process.exitCode=1;}finally{stop();}
