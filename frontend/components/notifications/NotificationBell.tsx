"use client";

import { Bell } from "lucide-react";

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
  /** `on-blue` = pastille verre sur le bandeau bleu ; `light` = fond clair. */
  surface?: "light" | "on-blue";
}

/* La pastille du compteur est le seul orange tolere hors CTA : c'est un
   indicateur, pas une action — il n'est pas cliquable independamment. */
export default function NotificationBell({
  unreadCount,
  onClick,
  surface = "light",
}: NotificationBellProps) {
  const surfaceClasses =
    surface === "on-blue"
      ? "glass-chip h-10 w-10 text-white hover:bg-white/[0.26]"
      : "h-10 w-10 rounded-chip text-ink-500 hover:bg-app hover:text-blue-700";

  return (
    <button
      onClick={onClick}
      className={`relative grid place-items-center transition-colors duration-120 focus-ring ${surfaceClasses}`}
      aria-label="Notifications"
    >
      <Bell className="h-[20px] w-[20px]" strokeWidth={2} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -end-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
