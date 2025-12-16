"use server";

import { serverAxiosInstance } from "@/helpers/axiosInstance";

export async function exportOrders() {
  try {
    const { data } = await serverAxiosInstance.get("/api/orders/export/csv");

    if (!data.success) {
      console.error("API export failed:", data.error);
      return { error: data.error || "Failed to fetch data for orders." };
    }

    return { data: data.data };
  } catch (error: any) {
    console.error("Orders export error:", error);
    return {
      error: error.response?.data?.error || "Failed to fetch data for orders."
    };
  }
}
