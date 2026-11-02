import {test} from "node:test";
import assert from "node:assert/strict";
import {contactSchema,safeSearch} from "../src/features/crm/schema";
import {fromSantiagoInput,santiagoInput} from "../src/features/crm/time";
import {appointmentTimes} from "../src/features/appointments/schema";
test("CRM validates and normalizes contact data without permitting script locations",()=>{
  const input={id:"",name:"Contacto de prueba",phone:"+56 9 0000 0000",email:"test@example.invalid",whatsapp:"",address:"",unit:"",commune:"",region:"",location_url:"",notes:"",source:"manual"};
  const result=contactSchema.parse(input);
  assert.equal(result.phone,"56900000000");assert.equal(result.address,null);
  assert.equal(contactSchema.safeParse({...input,location_url:"javascript:alert(1)"}).success,false);
  assert.equal(contactSchema.safeParse({...input,email:"invalid"}).success,false);
  assert.equal(safeSearch("x%,(id.eq.test)"),"xid.eq.test");
});
test("Santiago wall times roundtrip across winter and summer",()=>{
  assert.equal(fromSantiagoInput("2026-11-02T10:30"),"2026-11-02T13:30:00.000Z");
  assert.equal(fromSantiagoInput("2026-07-02T10:30"),"2026-07-02T14:30:00.000Z");
  assert.equal(santiagoInput("2026-11-02T13:30:00Z"),"2026-11-02T10:30");
  assert.throws(()=>fromSantiagoInput("2026-09-06T00:30"));
  assert.throws(()=>fromSantiagoInput("2026-02-31T10:00"));
});
test("appointments reject negative and oversized durations",()=>{
  assert.deepEqual(appointmentTimes("2026-11-02T10:00","2026-11-02T11:30"),{starts_at:"2026-11-02T13:00:00.000Z",ends_at:"2026-11-02T14:30:00.000Z"});
  assert.throws(()=>appointmentTimes("2026-11-02T10:00","2026-11-02T09:00"));
  assert.throws(()=>appointmentTimes("2026-11-02T10:00","2026-11-04T10:00"));
});
