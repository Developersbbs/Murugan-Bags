"use server";

import { revalidatePath } from "next/cache";
import { ServerActionResponse } from "@/types/server-action";

export async function bulkArchiveProducts(
    productIds: string[]
): Promise<ServerActionResponse> {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/bulk-archive`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ids: productIds,
                archived: true,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Bulk product archive failed:", result);
            return {
                dbError: result.error || "Failed to archive products.",
                success: false
            };
        }

        revalidatePath("/products");
        revalidatePath("/archives");

        return {
            success: true,
        };
    } catch (error: any) {
        console.error("Unexpected error in bulkArchiveProducts:", error);
        return { dbError: error.message || "An unexpected error occurred.", success: false };
    }
}
