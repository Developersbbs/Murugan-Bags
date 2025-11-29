"use server";

import { revalidatePath } from "next/cache";

import { ServerActionResponse } from "@/types/server-action";

export async function deleteProduct(
  productId: string
): Promise<ServerActionResponse> {
  try {

    // Use backend API directly
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Product deletion failed:", result);
      return { dbError: result.error || "Something went wrong. Could not delete the product." };
    }

    revalidatePath("/products");

    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error in deleteProduct:", error);
    return { dbError: error.message || "An unexpected error occurred." };
  }
}
