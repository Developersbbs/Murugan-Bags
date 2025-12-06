"use client";

import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Settings, LogOut, LayoutGrid } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { signOut } from "@/services/auth";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function Profile() {
  const { profile, isLoading, user } = useUser();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Don't render if no profile or still loading
  if (isLoading || !profile || !user) {
    return null;
  }
  const profileImageUrl = profile?.image_url && profile.image_url !== '' && (!Array.isArray(profile.image_url) || profile.image_url.length > 0)
    ? (Array.isArray(profile.image_url) ? profile.image_url[0] : profile.image_url)
    : undefined;
  console.log("Profile image URL:", profileImageUrl);
  console.log("Profile image_url from context:", profile?.image_url);

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "??";
    const names = name.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

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

  return (
    <div className="flex ml-2">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className="rounded-full ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <Avatar>
            {profileImageUrl && (
              <AvatarImage
                src={profileImageUrl}
                alt={profile?.name ?? "User avatar"}
                onError={(e) => {
                  console.error("Avatar image failed to load:", profileImageUrl);
                  console.error("Error event:", e);
                }}
              />
            )}
            <AvatarFallback>{getInitials(profile?.name)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          alignOffset={-10}
          className="flex flex-col"
          align="end"
        >
          <DropdownMenuItem asChild>
            <Link
              href="/"
              className="w-full justify-start py-3.5 pl-3 pr-8 tracking-wide !cursor-pointer"
            >
              <LayoutGrid className="mr-3 size-5" /> Dashboard
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/edit-profile"
              className="w-full justify-start py-3.5 pl-3 pr-8 tracking-wide !cursor-pointer"
            >
              <Settings className="mr-3 size-5" /> Edit Profile
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <button
              onClick={handleSignOut}
              disabled={isPending}
              className="w-full justify-start py-3.5 pl-3 pr-8 tracking-wide !cursor-pointer disabled:opacity-50"
            >
              <LogOut className="mr-3 size-5" /> Log Out
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
