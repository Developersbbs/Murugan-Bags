"use server";

import { revalidatePath } from "next/cache";
import { ProductServerActionResponse } from "@/types/server-action";

// For server actions, we need to use revalidatePath for now
// In the future, we could use React Query's queryClient.invalidateQueries
// but that requires access to the queryClient in server actions

export async function toggleProductPublishedStatus(
  productId: string,
  currentPublishedStatus: boolean,
  variantId?: string
): Promise<ProductServerActionResponse> {
  try {
    const newPublishedStatus = !currentPublishedStatus;

    console.log('Toggling product status:', {
      productId,
      variantId,
      currentPublishedStatus,
      newPublishedStatus
    });

    // Use the toggle-status endpoint for publishing/unpublishing products
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/toggle-status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: productId,
        variantId, // Include variantId in the request if provided
        published: newPublishedStatus,
      }),
    });

    const result = await response.json();
    console.log('Toggle status response:', result);

    if (!response.ok) {
      console.error("Product status update failed:", result);
      return {
        dbError: result.error || "Failed to update product status.",
        success: false
      };
    }

    // Instead of revalidating the entire path, we'll be more specific
    // Revalidate only the products page to avoid excessive cache clearing
    // For better performance, we're handling this in the frontend with targeted updates
    // revalidatePath("/products");

    return {
      success: true,
      stockValidation: result._stockValidation
    };
  } catch (error: any) {
    console.error("Unexpected error in toggleProductPublishedStatus:", error);
    return { dbError: error.message || "An unexpected error occurred.", success: false };
  }
}
