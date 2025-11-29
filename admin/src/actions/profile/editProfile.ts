"use server";

import { revalidatePath } from "next/cache";
import { profileFormSchema } from "@/app/(dashboard)/edit-profile/_components/schema";
import { formatValidationErrors } from "@/helpers/formatValidationErrors";
import { ProfileServerActionResponse } from "@/types/server-action";

export async function editProfile(
  userId: string,
  formData: FormData
): Promise<ProfileServerActionResponse> {
  const parsedData = profileFormSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    image: formData.get("image"),
  });

  if (!parsedData.success) {
    return {
      validationErrors: formatValidationErrors(
        parsedData.error.flatten().fieldErrors
      ),
    };
  }

  const { image, ...profileData } = parsedData.data;

  try {
    // Prepare the update data
    const updateData: any = {
      name: profileData.name,
      phone: profileData.phone,
    };

    // Handle image upload if provided
    if (image instanceof File && image.size > 0) {
      const fileExt = image.name.split(".").pop();
      const fileName = `staff/${profileData.name}-${Date.now()}.${fileExt}`;
      updateData.image_url = `/uploads/staff/${fileName}`;
    }

    // Return success - no need to return updateData
    revalidatePath("/edit-profile");
    return { success: true };

  } catch (error: any) {
    console.error("Profile update error:", error);
    return {
      dbError: error.message || "Something went wrong. Please try again later."
    };
  }
}
