import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

type Props = {
  scroll?: boolean;
};

export function useUpdateQueryString({ scroll = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const updateQueryString = useCallback(
    (name: string, value: string) => {
      // Check current URL to avoid unnecessary navigation
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get(name) === value) {
        return; // Already at correct value
      }

      const params = new URLSearchParams(window.location.search);
      params.set(name, value);

      const newUrl = `${pathname}?${params.toString()}`;

      // Use replace to avoid adding to history and causing loops
      router.replace(newUrl, { scroll });
    },
    [pathname, router, scroll]
  );

  return updateQueryString;
}
