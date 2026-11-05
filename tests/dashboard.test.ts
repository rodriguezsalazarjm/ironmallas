import { test } from "node:test";
import assert from "node:assert/strict";
import { dashboardPeriod } from "../src/features/dashboard/period";
test("dashboard dates cover inclusive Santiago days and current business month",()=>{
  const period=dashboardPeriod(undefined,undefined,new Date("2026-11-02T00:30:00Z"));
  assert.equal(period.fromDate,"2026-11-01");assert.equal(period.toDate,"2026-11-30");
  assert.equal(period.from,"2026-11-01T03:00:00.000Z");assert.equal(period.to,"2026-12-01T03:00:00.000Z");
  const spring=dashboardPeriod("2026-09-06","2026-09-06");
  assert.equal(spring.from,"2026-09-06T04:00:00.000Z");assert.equal(spring.to,"2026-09-07T03:00:00.000Z");
  assert.throws(()=>dashboardPeriod("2026-02-30","2026-03-01"));
  assert.throws(()=>dashboardPeriod("2026-11-03","2026-11-02"));
});
