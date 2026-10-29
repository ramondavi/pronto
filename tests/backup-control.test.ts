import test from "node:test";
import assert from "node:assert/strict";
import {backupApi, backupExecutionEnabled, backupPollingDelay, decodeBackupRuns, dispatchApprovedBackup, parseBackupDispatch, sameOriginBackupRequest} from "../src/lib/backup-control.ts";
const id = "10000000-0000-4000-8000-000000000001";
test("backup exige confirmação explícita e recusa destinos ou referências escolhidos pelo cliente",()=>{
 assert.equal(parseBackupDispatch(JSON.stringify({requestId:id,confirmed:true})),id);
 for(const value of [{requestId:id},{requestId:id,confirmed:false},{requestId:id,confirmed:"true"},{requestId:"x",confirmed:true},{requestId:id,confirmed:true,ref:"other"},{requestId:id,confirmed:true,token:"synthetic"}])assert.equal(parseBackupDispatch(JSON.stringify(value)),null);
 assert.equal(parseBackupDispatch("x".repeat(300)),null);assert.equal(parseBackupDispatch("{"),null);
});
test("requisições cruzadas, sem origem ou de formulário não acionam backup",()=>{
 const url="https://example.org/api/admin/backups";
 const request=(headers:Record<string,string>)=>new Request(url,{method:"POST",headers});
 assert.equal(sameOriginBackupRequest(request({origin:"https://example.org","content-type":"application/json"})),true);
 assert.equal(sameOriginBackupRequest(request({origin:"https://other.example","content-type":"application/json"})),false);
 assert.equal(sameOriginBackupRequest(request({"content-type":"application/json"})),false);
 assert.equal(sameOriginBackupRequest(request({origin:"https://example.org","content-type":"application/x-www-form-urlencoded"})),false);
 assert.equal(sameOriginBackupRequest(request({origin:"https://example.org","content-type":"application/json","sec-fetch-site":"cross-site"})),false);
});
test("produção, habilitação explícita e credencial são necessárias juntas",()=>{
 assert.equal(backupExecutionEnabled("production","true",true),true);
 for(const env of ["preview","development",undefined])assert.equal(backupExecutionEnabled(env,"true",true),false);
 assert.equal(backupExecutionEnabled("production","false",true),false);assert.equal(backupExecutionEnabled("production","true",false),false);
});
test("cadência segue andamento e recua em falhas sem consultas contínuas",()=>{
 assert.equal(backupPollingDelay(false,0),60000);assert.equal(backupPollingDelay(true,0),15000);
 assert.equal(backupPollingDelay(true,1),60000);assert.equal(backupPollingDelay(false,2),120000);assert.equal(backupPollingDelay(true,99),300000);
});
test("respostas do provedor são reduzidas a metadados e respostas parciais não fingem lista vazia",()=>{
 const run={id:1,created_at:"2026-10-29T08:23:00Z",status:"completed",conclusion:"skipped",event:"schedule",logs_url:"ignored",actor:{login:"ignored"}};
 assert.deepEqual(decodeBackupRuns({workflow_runs:[run]}),[{id:1,createdAt:run.created_at,status:"completed",conclusion:"skipped",event:"schedule"}]);
 assert.deepEqual(decodeBackupRuns({workflow_runs:[]}),[]);
 for(const value of [{},{workflow_runs:[null]},{workflow_runs:[{...run,status:"unrecognized"}]},{workflow_runs:[{...run,created_at:"invalid"}]}])assert.throws(()=>decodeBackupRuns(value),/provider_response/);
});
test("acionamento fixa o workflow aprovado e não contorna uma agenda desligada",async()=>{
 const result=await dispatchApprovedBackup({Authorization:"Bearer synthetic"},async(input,init)=>{
  assert.equal(input,backupApi+"/dispatches");assert.equal(init?.method,"POST");assert.equal(init?.redirect,"error");assert.equal(init?.cache,"no-store");
  assert.deepEqual(JSON.parse(String(init?.body)),{ref:"master",inputs:{first_copy:false}});
  return new Response(null,{status:204});
 });assert.equal(result,"accepted");
});
test("timeout e erro do provedor são incertos e nunca reenviados automaticamente",async()=>{
 for(const [status,outcome] of [[200,"accepted"],[204,"accepted"],[403,"rejected"],[422,"rejected"],[500,"unknown"]] as const){let calls=0;assert.equal(await dispatchApprovedBackup({},async()=>{calls++;return new Response(null,{status});}),outcome);assert.equal(calls,1);}
 let calls=0;assert.equal(await dispatchApprovedBackup({},async()=>{calls++;throw new Error("synthetic timeout");}),"unknown");assert.equal(calls,1);
});
