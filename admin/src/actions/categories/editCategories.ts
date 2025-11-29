// server-actions/categories.ts
"use server";

import { revalidatePath } from "next/cache";
import { apiPut } from "@/lib/api-server";
import { VServerActionResponse } from "@/types/server-action";

export async function editCategories(
  categoryIds: string[],
  formData: FormData
): Promise<VServerActionResponse> {
  if (!categoryIds || categoryIds.length === 0) {
    return { dbError: "No categories selected for update." };
  }

  // Keep only valid 24-character MongoDB ObjectIds
  const validIds = categoryIds.filter(id => /^[a-f\d]{24}$/i.test(id));
  if (validIds.length === 0) {
    return { dbError: "No valid category IDs provided." };
  }

  // Extract published value from FormData
  const published = formData.get("published") === "true";

  try {
    const result = await apiPut("/api/categories/bulk", {
      ids: validIds,
      published,
    });

    // Revalidate categories page
    revalidatePath("/categories");

    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error in editCategories:", error);
    return { dbError: error.message || "An unexpected error occurred." };
  }
}
