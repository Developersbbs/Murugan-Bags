"use server";

import { revalidatePath } from "next/cache";

import { serverAxiosInstance } from "@/helpers/axiosInstance";
import { ServerActionResponse } from "@/types/server-action";

export async function toggleStaffPublishedStatus(
  staffId: string,
  currentPublishedStatus: boolean
): Promise<ServerActionResponse> {
  try {
    const newPublishedStatus = !currentPublishedStatus;

    const { data } = await serverAxiosInstance.put(`/api/staff/${staffId}/status`, {
      is_active: newPublishedStatus,
    });

    if (!data.success) {
      console.error("API update failed:", data.error);
      return { dbError: data.error || "Failed to update staff status." };
    }

    revalidatePath("/staff");

    return { success: true };
  } catch (error: any) {
    console.error("Staff status update error:", error);
    return {
      dbError: error.response?.data?.error || "Failed to update staff status."
    };
  }
}
