import {z} from "zod";
export const inviteSchema=z.object({email:z.email().max(120).transform(v=>v.toLowerCase()),full_name:z.string().trim().min(2).max(120),role:z.enum(["ADMIN","SUPERADMIN"])});
export const profileSchema=z.object({id:z.uuid(),full_name:z.string().trim().min(2).max(120),role:z.enum(["ADMIN","SUPERADMIN"])});
export const passwordSchema=z.object({password:z.string().min(12).max(128),confirmation:z.string().min(12).max(128)}).refine(v=>v.password===v.confirmation);
