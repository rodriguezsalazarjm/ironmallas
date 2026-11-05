import {z} from "zod";
const text=z.string().max(12000).refine(v=>!/[<>]/.test(v),"Usa texto sin etiquetas HTML ni scripts.");
const label=text.max(240);
const https=z.url().max(2000).refine(v=>new URL(v).protocol==="https:","Usa un enlace HTTPS.");
const href=z.string().max(2000).refine(v=>/^#[\w-]+$/.test(v)||(/^\/(?!\/)/.test(v)&&!/[<>\\]/.test(v))||/^https:\/\//.test(v),"Enlace no permitido.");
const media=z.string().max(2000).refine(v=>{
  if(v.startsWith("/brand/")&&!v.includes("..")&&!v.includes("\\"))return true;
  try{const url=new URL(v);const configured=process.env.NEXT_PUBLIC_SUPABASE_URL;const own=configured?new URL(configured).hostname:null;return url.protocol==="https:"&&!url.username&&!url.password&&((url.hostname==="ironmallas.cl"&&url.pathname.startsWith("/wp-content/uploads/"))||(url.hostname===own&&url.pathname.startsWith("/storage/v1/object/public/public-media/")));}catch{return false;}
},"Usa un recurso de Iron Mallas o de su biblioteca Supabase.");
const image=z.object({src:media,alt:label,width:z.number().int().min(1).max(20000),height:z.number().int().min(1).max(20000)});
const title=z.object({kicker:label,titleLead:label,titleHighlight:label});
const spec=z.object({title:label,tags:z.array(label).max(20),highlights:z.array(text).max(30),note:text});
export const siteSchema=z.object({
  brand:z.object({name:label.min(1),legalName:label,tagline:label,logo:image,mascot:image}),
  contact:z.object({phoneDisplay:label,phoneE164:z.string().regex(/^\d{8,15}$/),email:z.email().max(120),location:label,serviceArea:label,instagramUrl:https,instagramHandle:label}),
  nav:z.array(z.object({label:label,href})).min(1).max(15),
  hero:z.object({titleLead:label,titleHighlight:label,subtitle:text,primaryCta:z.object({label,href}),whatsappCta:z.object({label,message:text}),video:z.object({src:media,type:z.enum(["video/mp4","video/webm"])}),trustPills:z.array(z.object({icon:z.enum(["shield","wrench","building","headset"]),label})).max(12),counter:z.object({value:z.number().int().min(0).max(100000000),suffix:label,label}).nullable()}),
  servicesIntro:title.extend({titleTail:label,intro:text}),
  services:z.array(z.object({slug:z.string().regex(/^[a-z0-9-]+$/),title:label,shortTitle:label,icon:z.enum(["shield","tv","blinds"]),image,modalities:z.array(z.enum(["full","install"])).min(1).max(2),description:text,benefits:z.array(text).max(30),details:z.object({specsTitle:label.optional(),specs:z.array(spec).max(20).optional(),stepsTitle:label.optional(),steps:z.array(text).max(30).optional(),useCases:z.array(text).max(30),procedureTitle:label.optional(),note:text})})).min(1).max(50),
  about:title.extend({tagline:label,story:z.array(text).max(30),quote:text,checks:z.array(text).max(30),image,badge:z.object({value:label,label}),pillars:z.array(z.object({icon:z.enum(["shield","ruler","user"]),title:label,description:text})).max(12)}),
  portfolioIntro:z.object({kicker:label,title:label}),
  projects:z.array(z.object({id:z.string().min(1).max(100),type:z.enum(["image","video"]),category:z.enum(["mallas","cortinas","videos"]),src:media,width:z.number().int().positive().optional(),height:z.number().int().positive().optional(),title:label,location:label,description:text})).max(150),
  schedule:title.extend({intro:text,benefits:z.array(text).max(30),note:text,cal:z.object({link:z.string().regex(/^[a-zA-Z0-9_/-]+$/),namespace:z.string().regex(/^[a-zA-Z0-9_-]+$/),origin:z.enum(["https://app.cal.com","https://cal.com"])})}),
  faqIntro:title.extend({intro:text}),faqs:z.array(z.object({question:label,answer:z.array(text).min(1).max(20),tags:z.array(label).max(20).optional()})).max(100),
  quoteForm:title.extend({intro:text,serviceOptions:z.array(label.min(1)).min(1).max(50),privacyNote:text}),
  footer:z.object({description:text,slogan:z.tuple([label,label]),otherServices:z.array(label).max(50),credit:z.object({label,href})}),
}).superRefine((content,context)=>{
  const ids=new Set<string>();content.projects.forEach((p,i)=>{if(ids.has(p.id))context.addIssue({code:"custom",path:["projects",i,"id"],message:"El identificador de cada proyecto debe ser único."});ids.add(p.id);});
  const slugs=new Set<string>();content.services.forEach((s,i)=>{if(slugs.has(s.slug))context.addIssue({code:"custom",path:["services",i,"slug"],message:"El identificador de cada servicio debe ser único."});slugs.add(s.slug);if(new Set(s.modalities).size!==s.modalities.length)context.addIssue({code:"custom",path:["services",i,"modalities"],message:"No repitas una modalidad."});});
});
export const contentSections:Record<string,string>={brand:"Marca y logotipo",contact:"Contacto y redes",nav:"Navegación",hero:"Portada",servicesIntro:"Presentación de servicios",services:"Servicios",about:"Nosotros",portfolioIntro:"Título del portafolio",projects:"Proyectos y videos",schedule:"Agenda pública",faqIntro:"Presentación de preguntas",faqs:"Preguntas frecuentes",quoteForm:"Formulario público",footer:"Pie de página"};
export const promotionSchema=z.object({title:label,text,href:z.union([z.literal(""),href]).refine(v=>!v.startsWith("https:")&&!v.includes("\\"),"Usa un enlace interno.")});
export const privacySchema=z.object({title:label,body:text.max(20000)});
