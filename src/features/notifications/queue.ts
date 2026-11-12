// No secrets here (the client is injected), so it stays importable from tests.
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database,Notification} from "@/lib/supabase/database.types";
import {LEASE_MS,MAX_ATTEMPTS,REVIEW_MESSAGE,WINDOW_MESSAGE,retryAllowed,retryDelayMs} from "./queue-rules";
type Db=SupabaseClient<Database>;
type Row=Pick<Notification,"id"|"attempts"|"created_at"|"payload">;

/**
 * Atomic claim: only one run wins (compare-and-set on `attempts`) and the lease on `send_after`
 * hides the row from concurrent runs until it is resolved. Returns false when another run owns it
 * or when a retry is no longer safe (then it is parked for manual review).
 */
export async function claimNotification(db:Db,n:Row,now:number){
  if(!retryAllowed(n,now)){
    await db.from("notifications").update({attempts:MAX_ATTEMPTS,last_error:WINDOW_MESSAGE}).eq("id",n.id).eq("attempts",n.attempts);
    return false;
  }
  const base=n.payload&&typeof n.payload==="object"&&!Array.isArray(n.payload)?n.payload as Record<string,unknown>:{};
  const payload=n.attempts===0?{...base,first_attempt_at:new Date(now).toISOString()}:base;
  const claimed=await db.from("notifications").update({attempts:n.attempts+1,send_after:new Date(now+LEASE_MS).toISOString(),payload:payload as Notification["payload"]})
    .eq("id",n.id).eq("attempts",n.attempts).in("status",["pending","failed"]).lte("send_after",new Date(now).toISOString()).select("id").maybeSingle();
  return !claimed.error&&!!claimed.data;
}

/** Failure after a claim: controlled retry with backoff, or manual review when retrying could duplicate. */
export async function releaseFailure(db:Db,id:string,attempt:number,message:string,review=false){
  const exhausted=review||attempt>=MAX_ATTEMPTS;
  await db.from("notifications").update({status:"failed",attempts:review?MAX_ATTEMPTS:attempt,
    last_error:(review?REVIEW_MESSAGE:exhausted?`${message} · Reintentos agotados: revisar manualmente.`:message).slice(0,500),
    send_after:new Date(Date.now()+(exhausted?0:retryDelayMs(attempt))).toISOString()}).eq("id",id);
}
