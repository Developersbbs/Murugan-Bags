"use client";

import PageTitle from "@/components/shared/PageTitle";
import EditProfileForm from "./_components/EditProfileForm";

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
