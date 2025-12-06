"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Props = ImageProps & {
  skeletonClassName?: string;
  containerClassName?: string;
};

export function ImagePlaceholder({
  skeletonClassName,
  containerClassName,
  className,
  alt,
  src,
  ...imageProps
}: Props) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Handle null/undefined src or empty array/string
  if (!src || (Array.isArray(src) && src.length === 0) || src === '') {
    return (
      <div className={cn("relative size-8 bg-muted rounded-full flex items-center justify-center", containerClassName)}>
        <span className="text-xs font-medium text-muted-foreground">
          {alt?.charAt(0)?.toUpperCase() || "?"}
        </span>
      </div>
    );
  }

  // Ensure src is a valid string
  const imageSrc = typeof src === 'string' ? src : (typeof src === 'object' && 'src' in src ? src.src : '');

  // If imageSrc is still empty or invalid, show placeholder
  if (!imageSrc || imageSrc.trim() === '') {
    return (
      <div className={cn("relative size-8 bg-muted rounded-full flex items-center justify-center", containerClassName)}>
        <span className="text-xs font-medium text-muted-foreground">
          {alt?.charAt(0)?.toUpperCase() || "?"}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative size-8", containerClassName)}>
      <Image
        {...imageProps}
        src={imageSrc}
        alt={alt}
        className={cn(!isLoaded && "opacity-0", className)}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsLoaded(false)}
        unoptimized={imageSrc.startsWith('https://firebasestorage.googleapis.com')}
      />

      <Skeleton
        className={cn(
          "size-8 rounded-full absolute left-0 top-0",
          skeletonClassName,
          isLoaded && "hidden"
        )}
      />
    </div>
  );
}
