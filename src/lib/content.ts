import "server-only";

import { siteContent } from "@/content/site";
import type { SiteContent } from "@/content/types";
import {cacheTag,cacheLife} from "next/cache";
import {createClient} from "@supabase/supabase-js";
import {supabaseConfig} from "./supabase/config";
import type {Database} from "./supabase/database.types";

/**
 * Fuente única del contenido público.
 * Textos, servicios, hero, galerías, FAQ y promociones se mantienen en `src/content/site.ts`
 * (versionado en Git). El panel ya no edita contenido web. Solo las reseñas aprobadas se leen
 * de Supabase, como módulo independiente.
 */
export async function getSiteContent(): Promise<SiteContent> {
  return siteContent;
}

export async function getPublicContent(){
  "use cache";
  cacheTag("public-content");cacheLife("minutes");
  const config=supabaseConfig();
  const fallback={site:siteContent,reviews:[] as PublicReview[]};
  if(!config)return fallback;
  try{
    const db=createClient<Database>(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(5000)})}});
    const reviews=await db.from("reviews").select("id,display_name,rating,presentation_text,photo_paths,featured,image_consent,created_at").eq("published",true).eq("publication_consent",true).order("featured",{ascending:false}).order("created_at",{ascending:false}).limit(12);
    const publishedReviews:PublicReview[]=reviews.error?[]:reviews.data.map(r=>({...r,photo_urls:r.image_consent?r.photo_paths.filter(p=>/^content\/[a-f0-9-]+\.jpg$/.test(p)).slice(0,6).map(p=>db.storage.from("public-media").getPublicUrl(p).data.publicUrl):[]}));
    return {site:siteContent,reviews:publishedReviews};
  }catch{return fallback;}
}
type PublicReview={id:string;display_name:string;rating:number;presentation_text:string|null;photo_paths:string[];photo_urls?:string[];featured:boolean;image_consent:boolean;created_at:string};
