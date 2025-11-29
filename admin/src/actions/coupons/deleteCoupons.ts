"use server";

import { revalidatePath } from "next/cache";

import { serverAxiosInstance } from "@/helpers/axiosInstance";
import { ServerActionResponse } from "@/types/server-action";

export async function deleteCoupons(
  couponIds: string[]
): Promise<ServerActionResponse> {
  try {
    const { data } = await serverAxiosInstance.delete("/api/coupons", {
      data: { ids: couponIds }
    });

    if (!data.success) {
      console.error("API bulk delete failed:", data.error);
      return { dbError: data.error || "Something went wrong. Could not delete the coupons." };
    }

    revalidatePath("/coupons");

    return { success: true };
  } catch (error: any) {
    console.error("Coupons bulk delete error:", error);
    return {
      dbError: error.response?.data?.error || "Something went wrong. Could not delete the coupons."
    };
  }
}
