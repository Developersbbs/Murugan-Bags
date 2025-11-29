import { Metadata } from "next";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

import PageTitle from "@/components/shared/PageTitle";

// Dynamically import the form to avoid SSR issues
const EditProfileForm = dynamic(() => import("./_components/EditProfileForm"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
});

export const metadata: Metadata = {
  title: "Edit Profile",
};

export default function EditProfilePage() {
  // This page requires client-side authentication
  // The form will handle authentication checks on the client side
  return (
    <section>
      <PageTitle>Edit Profile</PageTitle>
      <EditProfileForm />
    </section>
  );
}
