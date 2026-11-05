"use client";
import { useActionState, type ReactNode } from "react";
import { Button } from "./ui/button";
export type ActionState = { ok: boolean; message: string };
export function ActionForm({ action, children, label = "Guardar", className = "grid gap-4" }: { action: (state: ActionState, form: FormData) => Promise<ActionState>; children?: ReactNode; label?: string; className?: string }) {
  const [state, submit, pending] = useActionState(action, { ok: false, message: "" });
  return <form action={submit} className={className} aria-busy={pending}>{children}{state.message && <p role="status" aria-live="polite" className={`rounded-xl border p-3 text-sm ${state.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>{state.message}</p>}<Button disabled={pending} type="submit">{pending ? "Guardando…" : label}</Button></form>;
}
