import {test} from "node:test";
import assert from "node:assert/strict";
import {inviteSchema,profileSchema,passwordSchema} from "../src/features/users/schema";
test("administrative access accepts only known roles and bounded identities",()=>{
  const valid={email:"TEST@example.invalid",full_name:"Persona de prueba",role:"ADMIN"};
  assert.equal(inviteSchema.parse(valid).email,"test@example.invalid");
  assert.equal(inviteSchema.safeParse({...valid,role:"OWNER"}).success,false);
  assert.equal(inviteSchema.safeParse({...valid,email:"bad"}).success,false);
  assert.equal(profileSchema.safeParse({id:"bad",full_name:"Prueba",role:"SUPERADMIN"}).success,false);
});
test("own passwords require sufficient length and matching confirmation",()=>{
  assert.equal(passwordSchema.safeParse({password:"short",confirmation:"short"}).success,false);
  assert.equal(passwordSchema.safeParse({password:"different-test-value",confirmation:"mismatched-test-value"}).success,false);
  assert.equal(passwordSchema.safeParse({password:"synthetic-test-value",confirmation:"synthetic-test-value"}).success,true);
});
