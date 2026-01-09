"use client";

import Link from "next/link";
import { LogOut, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { FaBagShopping } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/shared/sidebar/navItems";
import Typography from "@/components/ui/typography";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { signOut } from "@/services/auth";
import React, { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  const handleSignOut = () => {
    startTransition(async () => {
      try {
        await signOut();
        router.push("/login");
      } catch (error) {
        console.error("Sign out failed:", error);
        // Force sign out even if API fails
        localStorage.removeItem("authToken");
        document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        router.push("/login");
      }
    });
  };

  const handleNavigation = (url: string) => {
    if (isMobile) {
      setOpenMobile(false);
    }

    // Show loading state for the specific navigation item
    setNavigatingTo(url);

    // Navigate immediately without transition
    router.push(url);
    // Reset navigation state after a short delay
    setTimeout(() => setNavigatingTo(null), 500);
  };

  return (
    <Sidebar className="shadow-md">
      <SidebarContent className="relative">
        <div className="pb-20 h-full">
          <div className="py-6 px-2 flex flex-col overflow-y-auto h-full">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "font-bold text-2xl px-6 gap-2 justify-start min-h-fit hover:bg-transparent"
              )}
            >
              <FaBagShopping className="size-6 text-primary mb-1 flex-shrink-0" />
              <Typography component="span">ECommerce</Typography>
            </Link>

            <ul className="pt-6 flex flex-col gap-y-2">
              {navItems.map((navItem, index) => (
                <li key={`nav-item-${index}`}>
                  {navItem.children ? (
                    <Collapsible className="group/collapsible">
                      <CollapsibleTrigger
                        suppressHydrationWarning
                        className={cn(
                          buttonVariants({ variant: "ghost" }),
                          "relative w-full justify-between px-5 py-4 gap-x-2.5 [&_svg]:size-6 [&_svg]:flex-shrink-0 font-medium text-base focus-visible:bg-accent focus-visible:text-accent-foreground group/trigger"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {navItem.icon}
                          {navItem.title}
                        </div>
                        <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent suppressHydrationWarning>
                        <ul className="pl-6 flex flex-col gap-y-1 mt-1">
                          {navItem.children.map((childItem, childIndex) => (
                            <li key={`child-item-${index}-${childIndex}`}>
                              <Link
                                href={childItem.url}
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleNavigation(childItem.url);
                                }}
                                className={cn(
                                  buttonVariants({ variant: "ghost" }),
                                  "relative w-full justify-start px-5 py-3 gap-x-2.5 [&_svg]:size-5 [&_svg]:flex-shrink-0 text-sm focus-visible:bg-accent focus-visible:text-accent-foreground",
                                  pathname === childItem.url &&
                                  "bg-accent text-accent-foreground after:content-[''] after:absolute after:top-0 after:left-0 after:h-full after:w-1 after:bg-primary after:rounded-r-lg"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  {navigatingTo === childItem.url ? (
                                    <Loader2 className="size-5 animate-spin" />
                                  ) : (
                                    childItem.icon
                                  )}
                                  {childItem.title}
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <Link
                      href={navItem.url}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavigation(navItem.url);
                      }}
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "relative w-full justify-start px-5 py-4 gap-x-2.5 [&_svg]:size-6 [&_svg]:flex-shrink-0 font-medium text-base focus-visible:bg-accent focus-visible:text-accent-foreground",
                        pathname === navItem.url &&
                        "bg-accent text-accent-foreground after:content-[''] after:absolute after:top-0 after:left-0 after:h-full after:w-1 after:bg-primary after:rounded-r-lg"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {navigatingTo === navItem.url ? (
                          <Loader2 className="size-6 animate-spin" />
                        ) : (
                          navItem.icon
                        )}
                        {navItem.title}
                      </div>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="px-6 py-4 absolute left-0 w-full right-0 bottom-0 border-t">
            <Button
              onClick={handleSignOut}
              disabled={isPending}
              className="w-full py-3 text-base whitespace-nowrap disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="size-6 mr-3 flex-shrink-0 animate-spin" />
              ) : (
                <LogOut className="size-6 mr-3 flex-shrink-0" />
              )}
              Log out
            </Button>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
