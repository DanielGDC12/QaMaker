import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className, type = "button", ...rest },
    ref
  ) {
    const cls = [styles.btn, styles[variant], styles[size], className]
      .filter(Boolean)
      .join(" ");
    return <button ref={ref} type={type} className={cls} {...rest} />;
  }
);
