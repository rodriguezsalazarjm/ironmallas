import { createHmac,timingSafeEqual } from "node:crypto";
import { z } from "zod";
const claimsSchema=z.object({id:z.uuid(),version:z.number().int().positive(),expires:z.number().int().positive()});
type Claims=z.infer<typeof claimsSchema>;
export function quoteShareAllowed(claims:Claims,quote:{current_version:number;status:string;valid_until:string},today:string){
  return claims.version===quote.current_version&&["draft","sent","accepted"].includes(quote.status)&&quote.valid_until>=today;
}
export function createQuoteShareToken(claims:Claims,secret:string):string{
  if(secret.length<32)throw new Error("El enlace seguro no está configurado.");
  const parsed=claimsSchema.parse(claims);const payload=Buffer.from(JSON.stringify(parsed)).toString("base64url");
  return `${payload}.${createHmac("sha256",secret).update(payload).digest("base64url")}`;
}
export function verifyQuoteShareToken(token:string,secret:string,now=Math.floor(Date.now()/1000)):Claims|null{
  if(secret.length<32||token.length>1024)return null;
  const [payload,signature,...rest]=token.split(".");if(!payload||!signature||rest.length)return null;
  const expected=createHmac("sha256",secret).update(payload).digest();let received:Buffer;
  try{received=Buffer.from(signature,"base64url");}catch{return null;}
  if(received.length!==expected.length||!timingSafeEqual(expected,received))return null;
  try{const result=claimsSchema.safeParse(JSON.parse(Buffer.from(payload,"base64url").toString("utf8")));if(!result.success||result.data.expires<=now||result.data.expires>now+7*24*3600)return null;return result.data;}catch{return null;}
}
