import {test} from "node:test";
import assert from "node:assert/strict";
const origin=process.env.TEST_BASE_URL;
test("account and user management routes reject anonymous navigation",{skip:!origin},async()=>{
  for(const path of ["/admin/usuarios","/admin/cuenta"]){const response=await fetch(`${origin}${path}`,{redirect:"manual"});assert.equal(response.status,307);assert.equal(new URL(response.headers.get("location")!,origin).pathname,"/admin/login");assert.match(response.headers.get("cache-control") ?? "",/no-store/);}
});
test("OTP confirmation rejects unsupported registration tokens without an open redirect",{skip:!origin},async()=>{
  const response=await fetch(`${origin}/auth/confirm?token_hash=synthetic-invalid&type=signup&next=https://example.invalid`,{redirect:"manual"});
  assert.equal(response.status,307);const target=new URL(response.headers.get("location")!,origin);assert.equal(target.pathname,"/admin/login");assert.equal(target.searchParams.get("error"),"link");assert.equal(target.origin,new URL(origin!).origin);assert.match(response.headers.get("cache-control") ?? "",/no-store/);assert.equal(response.headers.get("referrer-policy"),"no-referrer");
});
