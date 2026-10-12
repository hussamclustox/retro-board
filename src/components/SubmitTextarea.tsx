"use client";
import { useEffect, useRef } from "react";

interface Props extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onSubmit" | "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  /** Called on Enter (Shift+Enter inserts a newline). Text is only shared with others at this point. */
  onSubmit: (value: string) => void;
  onCancel?: () => void;
}

/** Auto-growing textarea: Enter submits, Shift+Enter adds a newline, Escape cancels. */
export function SubmitTextarea({ value, onChange, onSubmit, onCancel, className = "", ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        } else if (e.key === "Escape") {
          onCancel?.();
        }
      }}
      className={`block w-full resize-none overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 ${className}`}
      {...rest}
    />
  );
}
