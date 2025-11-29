"use server";

import { revalidatePath } from "next/cache";

import { productBulkFormSchema } from "@/app/(dashboard)/products/_components/form/schema";
import { formatValidationErrors } from "@/helpers/formatValidationErrors";
import { VServerActionResponse } from "@/types/server-action";

export async function editProducts(
  productIds: string[],
  formData: FormData
): Promise<VServerActionResponse> {
  const parsedData = productBulkFormSchema.safeParse({
    category:
      formData.get("category") === "" ? undefined : formData.get("category"),
    published:
      formData.get("published") === null
        ? undefined
        : !!(formData.get("published") === "true"),
  });

  if (!parsedData.success) {
    return {
      validationErrors: formatValidationErrors(
        parsedData.error.flatten().fieldErrors
      ),
    };
  }

  const { category, published } = parsedData.data;

  try {
    console.log('🔄 Starting bulk update for products:', productIds);
    console.log('🔄 Category:', category, 'Published:', published);

    // Update each product individually since there's no bulk endpoint
    const updatePromises = productIds.map(async (productId, index) => {
      console.log(`🔄 Updating product ${index + 1}/${productIds.length}: ${productId}`);

      const requestBody = {
        ...(category && { categories: JSON.stringify([{ category: category, subcategories: [] }]) }),
        ...(published !== undefined && { published }),
      };

      console.log(`🔄 Request body for product ${productId}:`, requestBody);
      console.log(`🔄 Product ID type: ${typeof productId}, value: ${productId}`);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`🔄 Response status for product ${productId}:`, response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ Failed to update product ${productId}:`, errorData);
        throw new Error(`Failed to update product ${productId}: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log(`✅ Successfully updated product ${productId}`);
      return result;
    });

    await Promise.all(updatePromises);

    revalidatePath("/products");

    return { success: true };
  } catch (error) {
    console.error("Bulk update failed:", error);
    return { dbError: "Something went wrong. Please try again later." };
  }
}
