import type { ButtonHTMLAttributes } from "react";

const VARIANTS = {
  primary: "bg-brand text-white hover:brightness-95",
  dark: "bg-ink text-white hover:bg-brand",
  outline: "border border-ink/20 bg-panel text-ink hover:border-brand hover:text-brand",
  ghost: "text-muted hover:text-ink",
  danger: "border border-rose-300 bg-panel text-rose-700 hover:bg-rose-50",
  success: "bg-emerald-700 text-white hover:bg-emerald-800",
} as const;

const SIZES = {
  sm: "px-2.5 py-1 text-[10px]",
  md: "px-4 py-2 text-xs",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

/** Monospace, uppercase, square: the app's only button. */
export function Button({ variant = "dark", size = "md", className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 font-mono font-bold tracking-wider uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
