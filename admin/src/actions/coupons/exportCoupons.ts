"use server";

import { serverAxiosInstance } from "@/helpers/axiosInstance";

export async function exportCoupons() {
  try {
    const { data } = await serverAxiosInstance.get("/api/coupons/export");

    if (!data.success) {
      console.error("API export failed:", data.error);
      return { error: data.error || "Failed to fetch data for coupons." };
    }

    return { data: data.data };
  } catch (error: any) {
    console.error("Coupons export error:", error);
    return {
      error: error.response?.data?.error || "Failed to fetch data for coupons."
    };
  }
}
