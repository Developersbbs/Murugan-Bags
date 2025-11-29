"use server";

import { revalidatePath } from "next/cache";

import { serverAxiosInstance } from "@/helpers/axiosInstance";
import { ServerActionResponse } from "@/types/server-action";

export async function deleteStaff(
  staffId: string
): Promise<ServerActionResponse> {
  try {
    const { data } = await serverAxiosInstance.delete(`/api/staff/${staffId}`);

    if (!data.success) {
      console.error("API delete failed:", data.error);
      return { dbError: data.error || "Something went wrong. Could not delete the staff." };
    }

    revalidatePath("/staff");

    return { success: true };
  } catch (error: any) {
    console.error("Staff delete error:", error);
    return {
      dbError: error.response?.data?.error || "Something went wrong. Could not delete the staff."
    };
  }
}
