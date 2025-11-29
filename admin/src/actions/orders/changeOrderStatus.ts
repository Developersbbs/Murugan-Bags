"use server";

import { revalidatePath } from "next/cache";

import { serverAxiosInstance } from "@/helpers/axiosInstance";
import { ServerActionResponse } from "@/types/server-action";
import { OrderStatus } from "@/services/orders/types";

export async function changeOrderStatus(
  orderId: string,
  newOrderStatus: OrderStatus
): Promise<ServerActionResponse> {
  try {
    const { data } = await serverAxiosInstance.put(`/api/orders/${orderId}/status`, {
      status: newOrderStatus,
    });

    if (!data.success) {
      console.error("API update failed:", data.error);
      return { dbError: data.error || "Failed to update order status." };
    }

    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Order status update error:", error);
    return {
      dbError: error.response?.data?.error || "Failed to update order status."
    };
  }
}
