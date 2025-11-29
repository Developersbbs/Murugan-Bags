"use server";

import { revalidatePath } from "next/cache";
import { promises as fs } from "fs";
import path from "path";
import { apiDelete, apiGet } from "@/lib/api-server";
import { ServerActionResponse } from "@/types/server-action";

export async function deleteCategories(categoryIds: string[]): Promise<ServerActionResponse> {
  try {
    // 1️⃣ Filter only valid, non-empty IDs
    const validIds = categoryIds.filter(id => id && id.trim().length > 0);
    if (validIds.length === 0) return { dbError: "No valid category IDs provided." };

    // 2️⃣ Fetch category details (to get image URLs) - using GET with query params
    const response = await apiGet<{ _id: string; image_url?: string }[]>(
      `/api/categories/bulk?ids=${validIds.join(",")}`
    );

    const categoriesData = Array.isArray(response?.data) ? response.data : [];
    if (categoriesData.length === 0) return { dbError: "No valid categories found for deletion." };

    // 3️⃣ Prepare image filenames for deletion
    const filesToDelete: string[] = [];

    categoriesData.forEach((category) => {
      if (category.image_url && typeof category.image_url === 'string') {
        const filename = category.image_url.split("/").pop();
        if (filename) {
          filesToDelete.push(`categories/${filename}`);
        }
      }
    });

    // 4️⃣ Delete image files from local filesystem
    if (filesToDelete.length > 0) {
      console.log("Category image files to delete:", filesToDelete);

      for (const relativePath of filesToDelete) {
        try {
          // Construct full path to file in uploads directory
          const uploadDir = path.join(process.cwd(), "uploads");
          const filePath = path.join(uploadDir, relativePath);

          try {
            // Check if file exists using promises API
            await fs.access(filePath);
            // Delete file using promises API
            await fs.unlink(filePath);
            console.log(`Deleted category image file: ${relativePath}`);
          } catch (accessError) {
            if ((accessError as any).code === 'ENOENT') {
              console.log(`Category image file not found, skipping: ${relativePath}`);
            } else {
              throw accessError;
            }
          }
        } catch (error) {
          console.error(`Failed to delete category image file ${relativePath}:`, error);
          // Continue with other files even if one fails
        }
      }
    }

    // 5️⃣ Delete categories from DB - Use apiDelete with body data
    await apiDelete("/api/categories/bulk", {
      "Content-Type": "application/json",
    }, { ids: validIds });

    // 6️⃣ Revalidate categories page
    revalidatePath("/categories");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete categories:", error);
    return { dbError: "Something went wrong. Could not delete the categories." };
  }
}