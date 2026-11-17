import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[calc(100svh-61px)] items-center justify-center overflow-hidden bg-white px-5 pb-36 pt-20 sm:px-8 sm:pb-48 sm:pt-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_0%,black_68%,transparent_100%)]"
      >
        <Image
          src="/banner.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={85}
          className="object-cover object-bottom"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#ffffff_0%,rgba(255,255,255,0.96)_8%,rgba(255,255,255,0.25)_40%,transparent_75%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_68%_at_50%_34%,#ffffff_0%,#ffffff_40%,rgba(255,255,255,0.94)_55%,rgba(255,255,255,0.4)_75%,transparent_100%)] sm:bg-[radial-gradient(ellipse_58%_72%_at_50%_32%,#ffffff_0%,#ffffff_25%,rgba(255,255,255,0.96)_2%,rgba(255,255,255,0.3)_76%,transparent_100%)]" />
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <p className="mb-7 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-medium text-blue-800 sm:mb-8 sm:text-sm broder border-blue-900">
          <Bell className="size-3.5" aria-hidden="true" />
          Your next purchase. At your price.
        </p>
        <h1 className="text-[clamp(2.5rem,5.4vw,4rem)] font-normal leading-[1] tracking-[-0.055em] text-2x  ">
          Keep an eye on  prices.
          <br />
          Not another open tab.
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-neutral-600 sm:mt-7 sm:max-w-lg sm:text-lg">
          Save the products you want, set your target price, and get an email
          when it’s time to buy.
        </p>
        <Button
          asChild
          size="sm"
          className="mt-8 bg-linear-to-b from-blue-500 to-blue-700 text-xs sm:mt-9"
        >
          <Link href="/tracker">
            Start tracking
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
