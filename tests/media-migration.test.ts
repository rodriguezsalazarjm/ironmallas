import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { allowedSource,sourceInventory,sniffMime,containedPath,replaceMediaUrls,inventoryHash } from "../scripts/lib/media-migration";
const source="https://ironmallas.cl/wp-content/uploads/2026/04/logo.png";
test("media inventory deduplicates exact public uploads and keeps every content pointer",()=>{
  const inventory=sourceInventory({brand:{src:source},items:[{image:source}],external:"https://example.invalid/video.mp4"});
  assert.equal(inventory.length,1);assert.deepEqual(inventory[0].used_at,["brand.src","items[0].image"]);
  assert.match(inventoryHash(inventory),/^[a-f0-9]{64}$/);
  const content={src:source,note:"Texto original",items:[source]};
  assert.deepEqual(replaceMediaUrls(content,{[source]:"https://storage.example.invalid/logo.png"}),{src:"https://storage.example.invalid/logo.png",note:"Texto original",items:["https://storage.example.invalid/logo.png"]});
  assert.equal(content.src,source);
});
test("media downloader forbids hosts, credentials, alternate paths and encoded traversal",()=>{
  assert.equal(allowedSource(source).hostname,"ironmallas.cl");
  for(const value of ["http://ironmallas.cl/wp-content/uploads/logo.png","https://other.invalid/wp-content/uploads/logo.png","https://user:pass@ironmallas.cl/wp-content/uploads/logo.png","https://ironmallas.cl/private/logo.png","https://ironmallas.cl/wp-content/uploads/../../private.png","https://ironmallas.cl/wp-content/uploads/a%2f..%2fprivate.png",`${source}?token=private`])assert.throws(()=>allowedSource(value));
  assert.throws(()=>containedPath(path.resolve("backup"),"../outside"));
});
test("media MIME checks use file signatures rather than names or HTTP declarations",()=>{
  assert.equal(sniffMime(Buffer.from([137,80,78,71,13,10,26,10])),"image/png");
  assert.equal(sniffMime(Buffer.from([255,216,255,0])),"image/jpeg");
  assert.equal(sniffMime(Buffer.from("RIFFxxxxWEBPmore")),"image/webp");
  assert.equal(sniffMime(Buffer.from([0,0,0,20,102,116,121,112,105,115,111,109])),"video/mp4");
  assert.equal(sniffMime(Buffer.from("<html>Error 406</html>")),null);
});
