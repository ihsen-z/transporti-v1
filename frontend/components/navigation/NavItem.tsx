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
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200
        ${
          isActive
            ? "bg-brand-600/10 text-brand-600 shadow-sm"
            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
        }
        ${isCollapsed ? "justify-center" : ""}
      `}
    >
      <Icon
        className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-brand-600" : "text-neutral-500"}`}
      />
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );
}
