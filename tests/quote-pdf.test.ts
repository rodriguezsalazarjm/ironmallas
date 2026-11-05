import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { generateQuotePdf } from "../src/features/quotes/pdf";
import { createQuoteShareToken,verifyQuoteShareToken,quoteShareAllowed } from "../src/features/quotes/share-token";
import type { QuoteSnapshot } from "../src/features/quotes/snapshot";
const fixture:QuoteSnapshot={quote:{id:"11111111-1111-4111-8111-111111111111",number:1,current_version:1,created_at:"2026-11-02T15:00:00Z",valid_until:"2026-11-09",status:"draft",subtotal:10000,discount_bps:0,discount_amount:0,net:10000,tax_bps:1900,tax:1900,total:11900,payment_terms:"Condiciones sintéticas solo para pruebas.",warranty:null,notes:"Documento sintético. No es un presupuesto comercial."},contact:{name:"Contacto de prueba",phone:"56900000000",email:"test@example.invalid",address:"Dirección sintética",unit:null,commune:"Prueba",region:null},company:{name:"Iron Mallas · Prueba",address:"Dirección de prueba",email:"test@example.invalid",phone:"56900000000"},items:[{description:"Concepto sintético",unit:"m2",width_mm:1000,height_mm:1000,quantity_milli:1000,unit_price:10000,min_price:0,surcharge_bps:0,line_total:10000,material:"Material de prueba",location:"Ubicación sintética"}]};
test("server PDF is valid and paginates long content without losing the document",async()=>{
  const pdf=await generateQuotePdf({...fixture,items:Array.from({length:50},(_,i)=>({...fixture.items[0],description:`Concepto ${i+1} ${"Texto largo de prueba ".repeat(12)}`})),quote:{...fixture.quote,notes:"x".repeat(3000)}});
  assert.equal(Buffer.from(pdf).subarray(0,5).toString(),"%PDF-");
  const parsed=await PDFDocument.load(pdf);
  assert.ok(parsed.getPageCount()>2);
  assert.match(parsed.getTitle()??"",/IM-000001/);
  for(const page of parsed.getPages()){assert.ok(page.getWidth()>590);assert.ok(page.getHeight()>840);}
});
test("quote sharing requires authentic unexpired bounded claims",()=>{
  const secret="test-only-secret-".repeat(3),now=1000000000;
  const token=createQuoteShareToken({id:fixture.quote.id,version:2,expires:now+3600},secret);
  assert.equal(verifyQuoteShareToken(token,secret,now)?.version,2);
  assert.equal(verifyQuoteShareToken(token,secret,now+3600),null);
  assert.equal(verifyQuoteShareToken(`${token}x`,secret,now),null);
  assert.equal(verifyQuoteShareToken(token,"other-test-secret-".repeat(3),now),null);
  assert.equal(verifyQuoteShareToken(token,"short",now),null);
  assert.equal(verifyQuoteShareToken(createQuoteShareToken({id:fixture.quote.id,version:2,expires:now+8*24*3600},secret),secret,now),null);
  const claims={id:fixture.quote.id,version:1,expires:now+3600};
  assert.equal(quoteShareAllowed(claims,{current_version:1,status:"sent",valid_until:"2026-11-09"},"2026-11-02"),true);
  assert.equal(quoteShareAllowed(claims,{current_version:2,status:"sent",valid_until:"2026-11-20"},"2026-11-02"),false);
  assert.equal(quoteShareAllowed(claims,{current_version:1,status:"draft",valid_until:"2026-11-09"},"2026-11-02"),true);
  assert.equal(quoteShareAllowed(claims,{current_version:1,status:"rejected",valid_until:"2026-11-09"},"2026-11-02"),false);
  assert.equal(quoteShareAllowed(claims,{current_version:1,status:"sent",valid_until:"2026-11-01"},"2026-11-02"),false);
});
