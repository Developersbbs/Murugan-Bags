"use server";

import { revalidatePath } from "next/cache";
import { serverAxiosInstance } from "@/helpers/axiosInstance";
import { staffFormSchema } from "@/app/(dashboard)/staff/_components/form/schema";
import { formatValidationErrors } from "@/helpers/formatValidationErrors";
import { StaffServerActionResponse } from "@/types/server-action";

export async function editStaff(
  staffId: string,
  formData: FormData
): Promise<StaffServerActionResponse> {
  const parsedData = staffFormSchema.safeParse({
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

  const { image, ...staffData } = parsedData.data;

  try {
    // Prepare the update data
    const updateData: any = {
      name: staffData.name,
      phone: staffData.phone,
    };

    // Handle image upload if provided
    if (image instanceof File && image.size > 0) {
      const fileExt = image.name.split(".").pop();
      const fileName = `staff/${staffData.name}-${Date.now()}.${fileExt}`;

      // In a real implementation, you would upload to your file storage service
      // For now, we'll just update the image_url field
      updateData.image_url = `/uploads/staff/${fileName}`;
    }

    // Update staff via MongoDB API
    const { data } = await serverAxiosInstance.put(`/api/staff/${staffId}`, updateData);

    if (!data.success) {
      console.error("API update failed:", data.error);
      return { dbError: data.error || "Something went wrong. Please try again later." };
    }

    revalidatePath("/staff");
    return { success: true, staff: data.data };

  } catch (error: any) {
    console.error("Staff update error:", error);
    return {
      dbError: error.response?.data?.error || "Something went wrong. Please try again later."
    };
  }
}
