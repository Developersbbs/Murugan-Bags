"use server";

import { serverAxiosInstance } from "@/helpers/axiosInstance";
import { OrdersExport } from "@/services/orders/types";
import { getDiscount } from "@/helpers/getDiscount";

export async function exportOrders() {
  try {
    const { data } = await serverAxiosInstance.get("/api/orders/export");

    if (!data.success) {
      console.error("API export failed:", data.error);
      return { error: data.error || "Failed to fetch data for orders." };
    }

    return {
      data: data.data.map(
        (order: any): OrdersExport => ({
          id: order.id,
          invoice_no: order.invoice_no,
          customer_name: order.customers?.name ?? "",
          customer_email: order.customers?.email ?? "",
          total_amount: order.total_amount,
          discount: getDiscount({
            coupon: order.coupons,
            totalAmount: order.total_amount,
            shippingCost: order.shipping_cost,
          }),
          shipping_cost: order.shipping_cost,
          payment_method: order.payment_method,
          order_time: order.order_time,
          status: order.status,
          created_at: order.created_at,
          updated_at: order.updated_at,
        })
      ),
    };
  } catch (error: any) {
    console.error("Orders export error:", error);
    return {
      error: error.response?.data?.error || "Failed to fetch data for orders."
    };
  }
}
