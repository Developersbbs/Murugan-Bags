"use server";

import { revalidatePath } from "next/cache";

import { serverAxiosInstance } from "@/helpers/axiosInstance";
import { ServerActionResponse } from "@/types/server-action";

export async function toggleCouponPublishedStatus(
  couponId: string,
  currentPublishedStatus: boolean
): Promise<ServerActionResponse> {
  try {
    const newPublishedStatus = !currentPublishedStatus;

    const { data } = await serverAxiosInstance.put(`/api/coupons/${couponId}/status`, {
      published: newPublishedStatus,
    });

    if (!data.success) {
      console.error("API update failed:", data.error);
      return { dbError: data.error || "Failed to update coupon status." };
    }

    revalidatePath("/coupons");

    return { success: true };
  } catch (error: any) {
    console.error("Coupon status update error:", error);
    return {
      dbError: error.response?.data?.error || "Failed to update coupon status."
    };
  }
}
