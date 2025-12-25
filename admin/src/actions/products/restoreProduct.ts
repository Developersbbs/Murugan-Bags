"use server";

import { revalidatePath } from "next/cache";
import { ServerActionResponse } from "@/types/server-action";

export async function restoreProduct(
    productId: string,
    variantId?: string
): Promise<ServerActionResponse> {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/toggle-archive-status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: productId,
                variantId,
                archived: false,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Product restore failed:", result);
            return {
                dbError: result.error || "Failed to restore product.",
                success: false
            };
        }

        revalidatePath("/products");
        revalidatePath("/archives");

        return {
            success: true,
        };
    } catch (error: any) {
        console.error("Unexpected error in restoreProduct:", error);
        return { dbError: error.message || "An unexpected error occurred.", success: false };
    }
}
