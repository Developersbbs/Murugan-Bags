"use client";

// OAuth providers temporarily disabled after migration from Supabase to MongoDB
// TODO: Implement OAuth with NextAuth.js, Auth0, or similar provider if needed

type Props = {
  authType?: "Login" | "Signup";
};

export default function AuthProviders({ authType = "Login" }: Props) {
  // OAuth providers are disabled - only email/password authentication is available
  return null;
}
