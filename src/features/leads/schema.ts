import { z } from "zod";

import { siteContent } from "@/content/site";

const serviceOptions = siteContent.quoteForm.serviceOptions as [string, ...string[]];

const optionalTracking = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : undefined));

/** Validated on the server for every submission of the public quote form. */
export const leadSchema = z.object({
  name: z
    .string({ error: "Ingresa tu nombre." })
    .trim()
    .min(2, "Ingresa tu nombre.")
    .max(80, "El nombre es demasiado largo."),
  phone: z
    .string({ error: "Ingresa tu teléfono." })
    .trim()
    .refine((v) => {
      const digits = v.replace(/\D/g, "");
      return /^[+\d\s()-]+$/.test(v) && digits.length >= 8 && digits.length <= 15;
    }, "Ingresa un teléfono válido, por ejemplo +569 1234 5678."),
  email: z.email("Ingresa un correo válido.").trim().max(120),
  service: z.enum(serviceOptions, { error: "Selecciona un servicio." }),
  commune: z.string().trim().max(60, "La comuna es demasiado larga.").optional(),
  message: z.string().trim().max(1500, "El mensaje no puede superar 1.500 caracteres.").optional(),
  consent: z.literal("on", { error: "Debes aceptar el uso de tus datos para responder la solicitud." }),
  tracking: z.object({
    utmSource: optionalTracking,
    utmMedium: optionalTracking,
    utmCampaign: optionalTracking,
    utmContent: optionalTracking,
    utmTerm: optionalTracking,
    landingPage: optionalTracking,
    referrer: optionalTracking,
  }),
});

export type LeadInput = z.infer<typeof leadSchema>;

export type LeadFieldErrors = Partial<Record<"name" | "phone" | "email" | "service" | "commune" | "message" | "consent", string>>;

export type LeadFormState =
  | { status: "idle" }
  | { status: "invalid"; fieldErrors: LeadFieldErrors; message: string }
  /** Valid data, but there is no persistent storage to save it in yet. */
  | { status: "unavailable"; message: string; whatsappHref: string }
  | { status: "error"; message: string }
  | { status: "success"; message: string };
