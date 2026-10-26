"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isCollapsed?: boolean;
}

export default function NavItem({
  href,
  icon: Icon,
  label,
  isCollapsed = false,
}: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`flex min-h-[44px] items-center gap-3 rounded-field px-3.5 py-2.5
        text-[14.5px] font-semibold transition-colors duration-120 ease-out
        ${
          isActive
            ? "bg-blue-50 text-blue-700"
            : "text-ink-500 hover:bg-app hover:text-ink-900"
        }
        ${isCollapsed ? "justify-center" : ""}`}
    >
      <Icon
        className={`h-[19px] w-[19px] flex-shrink-0 ${
          isActive ? "text-blue-700" : "text-ink-300"
        }`}
        strokeWidth={isActive ? 2.3 : 2}
      />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
