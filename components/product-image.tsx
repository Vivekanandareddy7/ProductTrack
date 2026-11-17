"use client";
import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import sources from "@/public/demo-products/sources.json";
export default function ProductImage({
  src,
  name,
  size = 128,
}: {
  src?: string;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const [fallback, setFallback] = useState(false);
  const remote = src?.startsWith("/demo-products/")
    ? (sources as Record<string, string>)[src.split("/").at(-1)!]
    : undefined;
  if (!src || failed)
    return (
      <div
        className="flex h-full w-full items-center justify-center text-neutral-300"
        role="img"
        aria-label={`${name}: image unavailable`}
      >
        <ImageOff size={28} />
      </div>
    );
  return (
    <Image
      src={fallback && remote ? remote : src}
      alt={name}
      width={size}
      height={size}
      unoptimized
      className="h-auto max-h-full w-auto max-w-full object-contain mix-blend-multiply"
      onError={() => {
        if (remote && !fallback) setFallback(true);
        else setFailed(true);
      }}
    />
  );
}
