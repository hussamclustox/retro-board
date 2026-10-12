import type { AuthorView } from "@/lib/types";
import { MaskIcon } from "./Icons";

/** "Jane" or "Anonymous". Nobody, the host included, sees an anonymous author's name. */
export function AuthorLabel({ author, isMine }: { author: AuthorView; isMine: boolean }) {
  const you = isMine && <span className="text-slate-400 dark:text-slate-500"> (you)</span>;
  if (!author.anonymous) {
    return (
      <span className="truncate">
        {author.name}
        {you}
      </span>
    );
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <MaskIcon className="h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-400" />
      <span className="truncate">
        Anonymous
        {you}
      </span>
    </span>
  );
}
