"use server";

import { revalidatePath } from "next/cache";

import { serverAxiosInstance } from "@/helpers/axiosInstance";
import { ServerActionResponse } from "@/types/server-action";

export async function deleteCoupon(
  couponId: string
): Promise<ServerActionResponse> {
  try {
    const { data } = await serverAxiosInstance.delete(`/api/coupons/${couponId}`);

    if (!data.success) {
      console.error("API delete failed:", data.error);
      return { dbError: data.error || "Something went wrong. Could not delete the coupon." };
    }

    revalidatePath("/coupons");

    return { success: true };
  } catch (error: any) {
    console.error("Coupon delete error:", error);
    return {
      dbError: error.response?.data?.error || "Something went wrong. Could not delete the coupon."
    };
  }
}
