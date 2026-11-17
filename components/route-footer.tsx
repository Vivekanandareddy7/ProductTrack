"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
export default function RouteFooter({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith("/tracker") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/s/")
    ? null
    : children;
}
