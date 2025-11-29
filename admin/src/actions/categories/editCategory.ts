"use server";

import { revalidatePath } from "next/cache";
import { categoryFormSchema } from "@/app/(dashboard)/categories/_components/form/schema";
import { formatValidationErrors } from "@/helpers/formatValidationErrors";
import { CategoryServerActionResponse } from "@/types/server-action";
import { apiPut } from "@/lib/api-server";
import { storage } from "@/firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function editCategory(
  categoryId: string,
  formData: FormData
): Promise<CategoryServerActionResponse> {
  // Parse subcategories from FormData
  const subcategoriesData: any[] = [];
  let subcategoryIndex = 0;

  // First, try to get subcategories as a JSON string (for direct API calls)
  const subcategoriesJson = formData.get('subcategories');
  
  if (subcategoriesJson && typeof subcategoriesJson === 'string') {
    try {
      const parsed = JSON.parse(subcategoriesJson);
      if (Array.isArray(parsed)) {
        parsed.forEach((subcat: any) => {
          if (subcat && subcat.name) {
            subcategoriesData.push({
              name: String(subcat.name),
              description: subcat.description ? String(subcat.description) : "",
              slug: subcat.slug ? String(subcat.slug) : "",
            });
          }
        });
      }
    } catch (e) {
      console.warn('Failed to parse subcategories JSON, falling back to form data', e);
    }
  }

  // If no subcategories from JSON, try the form data approach
  if (subcategoriesData.length === 0) {
    while (formData.has(`subcategories.${subcategoryIndex}.name`)) {
      const name = formData.get(`subcategories.${subcategoryIndex}.name`);
      const description = formData.get(`subcategories.${subcategoryIndex}.description`);
      const slug = formData.get(`subcategories.${subcategoryIndex}.slug`);

      if (name) {
        subcategoriesData.push({
          name: String(name),
          description: description ? String(description) : "",
          slug: slug ? String(slug) : "",
        });
      }
      subcategoryIndex++;
    }
  }

  console.log('Edit parsed subcategories data:', subcategoriesData);

  console.log('Edit FormData entries:');
  const entries = Array.from(formData.entries());
  entries.forEach(([key, value]) => {
    console.log(key, value);
  });

  // Validate input with Zod
  const parsedData = categoryFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    image: formData.get("image"),
    slug: formData.get("slug"),
    subcategories: subcategoriesData,
  });

  if (!parsedData.success) {
    return {
      validationErrors: formatValidationErrors(
        parsedData.error.flatten().fieldErrors
      ),
    };
  }

  try {
    // Prepare the request body as JSON
    const requestBody: any = {
      name: parsedData.data.name,
      description: parsedData.data.description || "",
      slug: parsedData.data.slug,
    };

    // Add subcategories as individual fields in the format expected by the backend
    subcategoriesData.forEach((subcat, index) => {
      requestBody[`subcategories.${index}.name`] = subcat.name;
      requestBody[`subcategories.${index}.description`] = subcat.description || '';
      requestBody[`subcategories.${index}.slug`] = subcat.slug || '';
    });

    // Handle image - either use the existing URL or upload the new file
    if (parsedData.data.image) {
      if (parsedData.data.image instanceof File && parsedData.data.image.size > 0) {
        // Upload the new image to Firebase Storage
        const fileExtension = parsedData.data.image.name.split('.').pop();
        const fileName = `category_${Date.now()}.${fileExtension}`;
        const storageRef = ref(storage, `categories/${fileName}`);
        
        try {
          // Upload the file
          const snapshot = await uploadBytes(storageRef, parsedData.data.image);
          // Get the download URL
          const imageUrl = await getDownloadURL(snapshot.ref);
          requestBody.image = imageUrl;
        } catch (error) {
          console.error("Error uploading image:", error);
          return {
            dbError: "Failed to upload image. Please try again."
          };
        }
      } else if (typeof parsedData.data.image === 'string') {
        // If it's already a string (URL), use it as is
        requestBody.image = parsedData.data.image;
      }
    }

    console.log('Sending update request with data:', requestBody);

    // Call backend API with JSON data
    const response = await apiPut<{ success: boolean; data: any }>(
      `/api/categories/${categoryId}`,
      requestBody
    );

    if (!response.success) {
      return { dbError: "Failed to update category" };
    }

    revalidatePath("/categories");

    return { success: true, category: response.data };
  } catch (error: any) {
    console.error("Category update failed:", error);

    // Handle specific error types
    if (error.message?.includes("duplicate") || error.message?.includes("already exists")) {
      if (error.message.toLowerCase().includes("slug")) {
        return {
          validationErrors: {
            slug: "This category slug is already in use. Please choose a different one.",
          },
        };
      } else if (error.message.toLowerCase().includes("name")) {
        return {
          validationErrors: {
            name: "A category with this name already exists. Please enter a unique name.",
          },
        };
      }
    }

    return { dbError: error.message || "Something went wrong." };
  }
}