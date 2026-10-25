import type { ButtonHTMLAttributes } from "react";

const VARIANTS = {
  primary: "bg-brand text-white hover:brightness-95",
  dark: "bg-ink text-white hover:bg-ink/90",
  outline: "border border-line bg-panel text-ink hover:border-ink/30 hover:bg-paper",
  ghost: "text-muted hover:text-ink",
  danger: "border border-rose-300 bg-panel text-rose-700 hover:bg-rose-50",
  success: "bg-emerald-700 text-white hover:bg-emerald-800",
} as const;

const SIZES = {
  sm: "min-h-9 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

/** Shared button sizing and tactile press feedback. */
export function Button({ variant = "dark", size = "md", className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
