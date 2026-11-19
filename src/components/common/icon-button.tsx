import { Button, type ButtonProps } from "@/components/ui/button";

type IconButtonProps = Omit<ButtonProps, "size" | "aria-label"> & {
  /** Required: icon-only controls must have an accessible name. */
  label: string;
  size?: "icon" | "icon-sm" | "icon-lg";
};

export function IconButton({ label, size = "icon", variant = "ghost", ...props }: IconButtonProps) {
  return <Button aria-label={label} title={label} size={size} variant={variant} {...props} />;
}
