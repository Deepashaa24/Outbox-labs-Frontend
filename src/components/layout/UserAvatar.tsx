import { useEffect, useState } from "react";
import type { User } from "../../types/user";

interface UserAvatarProps {
  user: User;
  size?: "small" | "large";
}

function getInitials(user: User): string {
  const name = user.name?.trim();
  if (!name) return user.email.slice(0, 1).toUpperCase();
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function UserAvatar({ user, size = "small" }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [user.avatarUrl]);

  const dimensions = size === "large" ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs";

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-slate-700 to-black font-semibold text-white ring-4 ring-slate-100 ${dimensions}`}
      aria-label={`${user.name ?? user.email} avatar`}
      title={user.name ?? user.email}
    >
      {user.avatarUrl && !imageFailed ? (
        <img
          src={user.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        getInitials(user)
      )}
    </span>
  );
}
