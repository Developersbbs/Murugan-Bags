"use server";

import { serverAxiosInstance } from "@/helpers/axiosInstance";

export async function exportProducts() {
  try {
    const { data } = await serverAxiosInstance.get("/api/products/export");

    if (!data.success) {
      console.error("API export failed:", data.error);
      return { error: data.error || "Failed to fetch data for products." };
    }

    return { data: data.data };
  } catch (error: any) {
    console.error("Products export error:", error);
    return {
      error: error.response?.data?.error || "Failed to fetch data for products."
    };
  }
}
