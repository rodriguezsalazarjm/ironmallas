import { z } from "zod";

// Contract of public.reviews; shared by server actions and form constraints.
export const REVIEW_NAME_MAX = 100;
export const REVIEW_TEXT_MAX = 3000;
export const reviewSchema = z.object({
  id: z.union([z.uuid(), z.literal("")]),
  contact_id: z.union([z.uuid(), z.literal("")]),
  display_name: z.string().trim().min(2).max(REVIEW_NAME_MAX),
  rating: z.coerce.number().int().min(1).max(5),
  original_text: z.string().trim().min(5).max(REVIEW_TEXT_MAX),
  presentation_text: z.string().trim().max(REVIEW_TEXT_MAX),
  photos: z.string().max(4000),
});
