import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide", {
  variants: {
    variant: {
      default: "bg-primary/10 text-primary",
      neutral: "bg-muted text-muted-foreground",
      success: "bg-green-100 text-green-700",
      warning: "bg-amber-100 text-amber-700",
      info: "bg-blue-100 text-blue-700",
      purple: "bg-purple-100 text-purple-700",
      danger: "bg-red-100 text-red-700",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
