"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { BrandCatLogo } from "@/components/brand-cat-logo";

type BrandLogoProps = {
  className?: string;
};

const LOGO_PATH = "/branding/catlogoforinterviewapp.svg";

export function BrandLogo({ className }: BrandLogoProps) {
  const [useFallback, setUseFallback] = useState(false);

  if (useFallback) {
    return <BrandCatLogo className={className} />;
  }

  return (
    <Image
      src={LOGO_PATH}
      alt=""
      aria-hidden="true"
      width={140}
      height={120}
      priority
      className={cn("brand-cat-logo-image", className)}
      onError={() => setUseFallback(true)}
    />
  );
}
