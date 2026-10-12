import type { OnlineUser } from "@/lib/useBoard";

const tints = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-fuchsia-500"];
const tint = (key: string) => tints[[...key].reduce((n, ch) => n + ch.charCodeAt(0), 0) % tints.length];

export function PresenceBar({ users, connected }: { users: OnlineUser[]; connected: boolean }) {
  const shown = users.slice(0, 5);
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
        title={connected ? "Live" : "Connecting…"}
      />
      <div className="flex -space-x-2">
        {shown.map((u) => (
          <span
            key={u.key}
            title={u.name}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white ring-2 ring-white dark:ring-slate-900 ${
              u.name === "Anonymous" ? "bg-violet-400" : tint(u.key)
            }`}
          >
            {u.name === "Anonymous" ? "?" : u.name.slice(0, 1).toUpperCase()}
          </span>
        ))}
        {users.length > shown.length && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300 ring-2 ring-white dark:ring-slate-900">
            +{users.length - shown.length}
          </span>
        )}
      </div>
      <span className="hidden text-xs text-slate-500 dark:text-slate-400 lg:inline">{users.length} online</span>
    </div>
  );
}
