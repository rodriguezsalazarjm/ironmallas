import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
// shadcn/ui Button pattern, adapted to Iron Mallas tokens.
export const buttonVariants = cva("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50", { variants: { variant: { default: "bg-navy-700 text-white hover:bg-navy-600", outline: "border border-line bg-white text-navy-700 hover:bg-navy-50", destructive: "bg-red-700 text-white hover:bg-red-800" } }, defaultVariants: { variant: "default" } });
export function Button({ className, variant, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant }), className)} {...props} />;
}
