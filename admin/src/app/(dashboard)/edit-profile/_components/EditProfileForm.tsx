"use client";

import { useTransition, useRef, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FieldErrors } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/shared/form/FormSubmitButton";
import {
  FormTextInput,
  FormImageInput,
  FormReadonly,
} from "@/components/shared/form";

import { profileFormSchema, ProfileFormData } from "./schema";
import { fetchStaffDetails, updateStaff } from "@/services/staff";
import { Staff } from "@/services/staff/types";
import { useUser } from "@/contexts/UserContext";
import { uploadFile } from "@/lib/firebase/storage";

export default function EditProfileForm() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [profile, setProfile] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const imageDropzoneRef = useRef<HTMLDivElement>(null);
  const { refetch: refetchUser } = useUser(); // Get refetch function from UserContext


  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Check if user is authenticated first
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.error("No authentication token found");
          router.push("/login");
          return;
        }

        console.log("EditProfileForm: Token found, fetching user...");
        const userProfile = await fetchStaffDetails();
        if (userProfile) {
          setProfile(userProfile);
        } else {
          console.error("No profile found, redirecting to login");
          router.push("/login");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: profile?.name || "",
      phone: profile?.phone || "",
      image: profile?.image_url || undefined,
    },
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name,
        phone: profile.phone ?? "",
        image: profile.image_url ?? undefined,
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!profile) return;

    startTransition(async () => {
      try {
        console.log("Updating profile with data:", data);
        
        let imageUrl = profile.image_url;
        
        // Handle image upload if a new image is provided
        if (data.image instanceof File && data.image.size > 0) {
          try {
            // Upload the new image to Firebase Storage
            toast.info("Uploading profile picture...");
            const userId = profile._id; // Get user ID from profile
            imageUrl = await uploadFile(data.image, `adminProfilePic/${userId}`);
            console.log("Image uploaded to:", imageUrl);
          } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Failed to upload profile picture. Please try again.");
            return;
          }
        }

        // Prepare the update data
        const updateData = {
          name: data.name,
          phone: data.phone || '',
          image_url: imageUrl
        };

        console.log("Sending update request with data:", updateData);

        // Make API call to update the profile
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/staff`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          toast.error(result.error || "Failed to update profile");
          return;
        }

        toast.success("Profile updated successfully!");
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["staff"] });
        queryClient.invalidateQueries({ queryKey: ["user-profile"] });
        
        // Refresh user data
        await refetchUser();

      } catch (error: any) {
        console.error("Profile update error:", error);
        toast.error("Something went wrong. Please try again later.");
      }
    });
  };

  const onInvalid = (errors: FieldErrors<ProfileFormData>) => {
    if (errors.image) {
      imageDropzoneRef.current?.focus();
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-5 p-6 md:px-8 md:py-10">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <Card className="mb-5 p-6 md:px-8 md:py-10">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
          <div className="space-y-6">
            <FormImageInput
              control={form.control}
              name="image"
              label="Profile Picture"
              previewImage={profile.image_url ?? undefined}
              ref={imageDropzoneRef}
            />

            <FormTextInput
              control={form.control}
              name="name"
              label="Name"
              placeholder="Your name"
            />

            <FormReadonly label="Email" value={profile.email} />

            <FormTextInput
              control={form.control}
              name="phone"
              label="Contact Number"
              placeholder="Your number"
            />
          </div>

          <div className="flex justify-end mt-10">
            <FormSubmitButton isPending={isPending}>
              Update Profile
            </FormSubmitButton>
          </div>
        </form>
      </Form>
    </Card>
  );
}
