"use client";
import { useState, useEffect } from "react";
import AuthButton from "@/components/auth-button";
import { CommandPalette } from "@/components/command-palette";
import { createClient } from "@/lib/superbase/client";

import { User } from "@/utils/types";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Header = () => {
  const pathname = usePathname();
  const trackerRoute =
    pathname.startsWith("/tracker") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/p/");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header
      className={`bg-neutral-50/30 px-8 border-b border-neutral-200 backdrop-blur-lg top-0 sticky z-20 w-full ${trackerRoute ? "flex h-16 items-center" : "py-3"}`}
    >
      <div
        className={`flex w-full items-center justify-between mx-auto ${trackerRoute ? "max-w-[1376px]" : "md:max-w-5xl max-w-sm"}`}
      >
        <div>
          <Link href={"/"} className="flex items-center group" aria-label="ProductTrack home">
            <span className="text-lg font-semibold tracking-tight text-neutral-900">
              ProductTrack
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <CommandPalette />
          <AuthButton user={user} />
        </div>
      </div>
    </header>
  );
};

export default Header;
