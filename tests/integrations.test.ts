import {test} from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {normalizeCalEvent,verifyCalSignature,readLimitedBody} from "../src/features/integrations/cal";
import {siteSchema} from "../src/features/content/schema";
import {siteContent} from "../src/content/site";
import {imageSignature} from "../src/features/media/validation";
test("Cal verifies original bytes and rejects forged/malformed signatures",()=>{
  const raw=JSON.stringify({triggerEvent:"BOOKING_CREATED",createdAt:"2026-11-02T12:00:00Z",payload:{uid:"test-booking",startTime:"2026-11-04T12:00:00Z",endTime:"2026-11-04T13:00:00Z",attendees:[{name:"Prueba técnica",email:"test@example.invalid"}]}});
  const secret="test-only-secret-".repeat(3);const signature=createHmac("sha256",secret).update(raw).digest("hex");
  assert.ok(verifyCalSignature(raw,signature,secret));assert.equal(verifyCalSignature(raw+" ",signature,secret),false);assert.equal(verifyCalSignature(raw,"xyz",secret),false);
  const normalized=normalizeCalEvent(raw);assert.equal(normalized.payload.contact?.phone,null);assert.equal(normalized.eventKey,normalizeCalEvent(raw).eventKey);
});
test("Cal body size limit rejects payload before normalization",async()=>{await assert.rejects(readLimitedBody(new Request("http://localhost/test",{method:"POST",body:"x".repeat(100)}),10));});
test("CMS preserves original structure and rejects executable content",()=>{
  assert.ok(siteSchema.safeParse(siteContent).success);
  const unsafe=structuredClone(siteContent);unsafe.hero.subtitle="<script>alert(1)</script>";assert.equal(siteSchema.safeParse(unsafe).success,false);
  const link=structuredClone(siteContent);link.hero.primaryCta.href="javascript:alert(1)";assert.equal(siteSchema.safeParse(link).success,false);
  const cal=structuredClone(siteContent);cal.schedule.cal.origin="https://evil.example";assert.equal(siteSchema.safeParse(cal).success,false);
  const duplicate=structuredClone(siteContent);duplicate.projects.push(duplicate.projects[0]);assert.equal(siteSchema.safeParse(duplicate).success,false);
  const external=structuredClone(siteContent);external.brand.logo.src="https://evil.example/image.png";assert.equal(siteSchema.safeParse(external).success,false);
});
test("file signatures reject disguised HTML/SVG",()=>{assert.equal(imageSignature(new TextEncoder().encode("<svg onload='alert(1)'>")),false);assert.ok(imageSignature(new Uint8Array([255,216,255,0])));});
