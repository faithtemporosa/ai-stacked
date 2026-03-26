import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 hover:shadow-[0_0_30px_hsl(var(--primary-glow)/.5)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-105",
        outline: "border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground hover:scale-105",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:scale-105 hover:shadow-[0_0_30px_hsl(var(--secondary)/.4)]",
        ghost: "hover:bg-accent/20 hover:text-accent",
        link: "text-primary underline-offset-4 hover:underline hover:scale-105",
        retro: "bg-gradient-to-r from-primary via-secondary to-accent text-white hover:scale-105 hover:shadow-neon font-bold",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-xl px-4",
        lg: "h-14 rounded-2xl px-10 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
