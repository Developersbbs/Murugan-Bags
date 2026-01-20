"use client";

import { createContext, useContext, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { User } from "@/types/api";
import { getCurrentUser, isAuthenticated } from "@/services/auth";

export type UserRole = string;

type UserProfile = {
  name: string;
  image_url?: string;
  role: UserRole;
};

type UserContextType = {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  refetch: () => void;
};

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  isLoading: true,
  refetch: () => { },
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  // Listen for authentication state changes (token changes)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken') {
        // Token changed, invalidate user query
        queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // ← Remove queryClient from dependencies

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      // Check if user is authenticated first
      if (!isAuthenticated()) {
        console.log("UserContext: User not authenticated");
        return { user: null, profile: null };
      }

      try {
        console.log("UserContext: Fetching current user...");
        const user = await getCurrentUser();
        console.log("UserContext: User fetched:", user);

        const profile: UserProfile = {
          name: user.name,
          image_url: user.image_url, // Get image from database
          role: user.role,
        };

        console.log("UserContext: Profile created with image_url:", user.image_url);
        return { user, profile };
      } catch (error) {
        console.error('UserContext: Failed to fetch user:', error);

        // Don't clear auth state here - getCurrentUser already does it
        // Just return null to indicate no user
        return { user: null, profile: null };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - increased to reduce refetches
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in cache longer
    retry: false, // Don't retry on auth failure
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent unnecessary API calls
    refetchOnMount: false, // Don't refetch on mount if data exists
  });

  const value = {
    user: data?.user ?? null,
    profile: data?.profile ?? null,
    isLoading,
    refetch,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}