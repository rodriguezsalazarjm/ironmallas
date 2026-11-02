import {NextResponse,type NextRequest} from "next/server";
import {createSupabaseServer} from "@/lib/supabase/server";
import {supabaseConfig} from "@/lib/supabase/config";
export async function GET(request:NextRequest){
  const hash=request.nextUrl.searchParams.get("token_hash"),type=request.nextUrl.searchParams.get("type");
  const fail=()=>{const response=NextResponse.redirect(new URL("/admin/login?error=link",request.url));response.headers.set("Cache-Control","private, no-store");response.headers.set("Referrer-Policy","no-referrer");return response;};
  if(!supabaseConfig() || !hash || hash.length>256 || (type!=="invite" && type!=="recovery"))return fail();
  try{const db=await createSupabaseServer();const result=await db.auth.verifyOtp({token_hash:hash,type});if(result.error)return fail();const response=NextResponse.redirect(new URL("/admin/cuenta",request.url));response.headers.set("Cache-Control","private, no-store");response.headers.set("Referrer-Policy","no-referrer");return response;}catch{return fail();}
}
