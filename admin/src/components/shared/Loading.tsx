"use client";

import { ThreeCircles } from "react-loader-spinner";

export function Loading() {
  return (
    <div className="py-16 sm:py-20 w-full h-full grid place-items-center">
      <div className="flex flex-col items-center gap-4">
        <ThreeCircles
          visible={true}
          height="100%"
          width="100%"
          color="current-color"
          ariaLabel="three-circles-loading"
          wrapperClass="size-24 md:28 xl:32 fill-primary stroke-primary [&>svg]:overflow-visible"
        />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading page...
        </p>
      </div>
    </div>
  );
}

