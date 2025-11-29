"use server";

import { revalidatePath } from "next/cache";

import { serverAxiosInstance } from "@/helpers/axiosInstance";
import { ServerActionResponse } from "@/types/server-action";

export async function deleteCustomer(
  customerId: string
): Promise<ServerActionResponse> {
  try {
    const { data } = await serverAxiosInstance.delete(`/api/customers/${customerId}`);

    if (!data.success) {
      console.error("API delete failed:", data.error);
      return { dbError: data.error || "Something went wrong. Could not delete the customer." };
    }

    revalidatePath("/customers");

    return { success: true };
  } catch (error: any) {
    console.error("Customer delete error:", error);
    return {
      dbError: error.response?.data?.error || "Something went wrong. Could not delete the customer."
    };
  }
}
