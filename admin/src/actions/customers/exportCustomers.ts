"use server";

import { serverAxiosInstance } from "@/helpers/axiosInstance";

export async function exportCustomers() {
  try {
    const { data } = await serverAxiosInstance.get("/api/customers/export");

    if (!data.success) {
      console.error("API export failed:", data.error);
      return { error: data.error || "Failed to fetch data for customers." };
    }

    return { data: data.data };
  } catch (error: any) {
    console.error("Customers export error:", error);
    return {
      error: error.response?.data?.error || "Failed to fetch data for customers."
    };
  }
}
