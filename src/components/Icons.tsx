// Small inline icon set (stroke icons, 24x24 viewBox).
type P = { className?: string };
const base = (className = "h-4 w-4") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const ThumbIcon = ({ className, filled }: P & { filled?: boolean }) => (
  <svg {...base(className)} fill={filled ? "currentColor" : "none"}>
    <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3Zm0 0 4-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 17.6 21H7" />
  </svg>
);
export const CommentIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />
  </svg>
);
export const PencilIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
export const TrashIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
  </svg>
);
export const PlusIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const ShareIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14" />
  </svg>
);
export const LockIcon = ({ className, open }: P & { open?: boolean }) => (
  <svg {...base(className)}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d={open ? "M8 11V7a4 4 0 0 1 7.8-1.2" : "M8 11V7a4 4 0 0 1 8 0v4"} />
  </svg>
);
export const EyeIcon = ({ className, off }: P & { off?: boolean }) => (
  <svg {...base(className)}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </svg>
);
export const MaskIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M3 8c3-2 15-2 18 0 0 6-3 9-6 9-1.5 0-2-2-3-2s-1.5 2-3 2c-3 0-6-3-6-9Z" />
    <circle cx="8.5" cy="11" r="1.2" />
    <circle cx="15.5" cy="11" r="1.2" />
  </svg>
);
export const BackIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const CopyIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </svg>
);
export const DownloadIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 3v12M7 10l5 5 5-5M4 19h16" />
  </svg>
);
export const MoonIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);
export const SunIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
