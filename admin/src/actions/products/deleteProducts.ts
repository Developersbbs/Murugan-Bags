"use server";

import { revalidatePath } from "next/cache";
import { promises as fs } from "fs";
import path from "path";

import { ServerActionResponse } from "@/types/server-action";

export async function deleteProducts(
  productIds: string[]
): Promise<ServerActionResponse> {
  try {
    // Fetch products to get their file paths before deletion
    const productsData: any[] = [];

    for (const productId of productIds) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const productData = await response.json();
          if (productData.success && productData.data) {
            productsData.push(productData.data);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch product ${productId} for deletion:`, error);
        return { dbError: `Could not find product ${productId} to delete.` };
      }
    }

    // Extract file paths for cleanup (images and digital files)
    const filesToDelete: string[] = [];

    productsData?.forEach((product) => {
      // Handle image URLs
      if (product.image_url) {
        const urls = Array.isArray(product.image_url) ? product.image_url : [product.image_url];

        urls.forEach((url: string) => {
          if (typeof url === 'string' && url.includes('/')) {
            const filename = url.split("/").pop();
            if (filename) {
              filesToDelete.push(`products/${filename}`);
            }
          }
        });
      }

      // Handle digital product files
      if (product.product_type === 'digital' && product.file_path) {
        const filePath = product.file_path;
        if (typeof filePath === 'string' && filePath.includes('/')) {
          const filename = filePath.split("/").pop();
          if (filename) {
            filesToDelete.push(`products/${filename}`);
          }
        }
      }
    });

    // Delete files from local filesystem
    if (filesToDelete.length > 0) {
      console.log("Files to delete:", filesToDelete);

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
            console.log(`Deleted file: ${relativePath}`);
          } catch (accessError) {
            if ((accessError as any).code === 'ENOENT') {
              console.log(`File not found, skipping: ${relativePath}`);
            } else {
              throw accessError;
            }
          }
        } catch (error) {
          console.error(`Failed to delete file ${relativePath}:`, error);
          // Continue with other files even if one fails
        }
      }
    }

    // Delete products from database
    for (const productId of productIds) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Failed to delete product ${productId}:`, errorData);
          return { dbError: `Something went wrong. Could not delete product ${productId}.` };
        }
      } catch (error) {
        console.error(`Error deleting product ${productId}:`, error);
        return { dbError: `Something went wrong. Could not delete product ${productId}.` };
      }
    }

    revalidatePath("/products");

    return { success: true };
  } catch (error) {
    console.error("Unexpected error in deleteProducts:", error);
    return { dbError: "An unexpected error occurred while deleting products." };
  }
}
