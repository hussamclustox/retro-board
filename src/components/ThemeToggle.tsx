"use client";
import { saveTheme } from "@/lib/storage";
import { MoonIcon, SunIcon } from "./Icons";

/** Each user picks their own theme; it's saved in this browser only. */
export function ThemeToggle() {
  const toggle = () => {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    saveTheme(dark ? "dark" : "light");
  };

  // Icons switch via CSS so server and client render the same markup.
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <MoonIcon className="h-4 w-4 dark:hidden" />
      <SunIcon className="hidden h-4 w-4 dark:block" />
    </button>
  );
}
