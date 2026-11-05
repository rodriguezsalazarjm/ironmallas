import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateQuote, parseScaledDecimal, roundHalfUp, type Rate } from "../src/features/quotes/calculation";
// Synthetic rates are used only for arithmetic tests and are never seeded into the product.
const rates: Rate[] = [{ id:"test",name:"Tarifa sintética",unit:"m2",unit_price:10001,min_price:0,surcharge_bps:0,max_discount_bps:1000,active:true,material:null }];
test("decimal dimensions and CLP amounts use exact integer rounding", () => {
  assert.equal(parseScaledDecimal("1,235",3),1235);
  assert.throws(() => parseScaledDecimal("1.0001",3));
  assert.throws(() => parseScaledDecimal("1e3",3));
  assert.equal(roundHalfUp(BigInt(5),BigInt(2)),BigInt(3));
  const result = calculateQuote([{rule_id:"test",width_mm:1500,height_mm:2000,quantity_milli:2000}],rates,1000,1900);
  assert.equal(result.subtotal,60006);
  assert.equal(result.discount,6001);
  assert.equal(result.net,54005);
  assert.equal(result.tax,10261);
  assert.equal(result.total,64266);
  assert.equal(result.items[0].area_m2,"6.000");
});
test("minimums, configured surcharges and non-area services are explicit", () => {
  const result = calculateQuote([{rule_id:"test",width_mm:0,height_mm:0,quantity_milli:1500}], [{...rates[0],unit:"hour",unit_price:100,min_price:1000,surcharge_bps:1250}],0,0);
  assert.equal(result.subtotal,1125);
  assert.equal(result.items[0].area_m2,null);
});
test("unconfigured tariffs, excessive discounts and unsafe numbers cannot issue quotes", () => {
  const items = [{rule_id:"test",width_mm:1000,height_mm:1000,quantity_milli:1000}];
  assert.throws(() => calculateQuote(items,[],0,1900));
  assert.throws(() => calculateQuote(items,[{...rates[0],active:false}],0,1900));
  assert.throws(() => calculateQuote(items,rates,1001,1900));
  assert.equal(calculateQuote(items,rates,1001,1900,true).discount_bps,1001);
  assert.throws(() => calculateQuote([{...items[0],quantity_milli:0}],rates,0,1900));
  assert.throws(() => calculateQuote(items,[{...rates[0],unit_price:Infinity}],0,1900));
});
