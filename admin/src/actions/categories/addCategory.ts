"use server";

import { revalidatePath } from "next/cache";
import { categoryFormSchema } from "../../app/(dashboard)/categories/_components/form/schema";
import { formatValidationErrors } from "@/helpers/formatValidationErrors";
import { CategoryServerActionResponse } from "@/types/server-action";
import { ApiResponse, Category } from "@/types/api";
import { storage } from "@/firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function addCategory(
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

  // Get the image file
  const imageFile = formData.get("image") as File | null;

  // If no image is provided, return an error
  if (!imageFile) {
    return {
      success: false,
      message: "Image is required",
      errors: {
        image: ["Image is required"],
      },
    };
  }

  // Upload the image to Firebase Storage
  let imageUrl = "";
  try {
    // Create a unique filename
    const fileExtension = imageFile.name.split('.').pop();
    const fileName = `category_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `categories/${fileName}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, imageFile);
    // Get the download URL
    imageUrl = await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error("Error uploading image:", error);
    return {
      success: false,
      message: "Failed to upload image",
      errors: {
        image: ["Failed to upload image. Please try again."],
      },
    };
  }

  // Validate form data
  const parsedData = categoryFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || "",
    image: imageUrl, // Use the uploaded image URL
    slug: formData.get("slug"),
    subcategories: subcategoriesData,
  });

  if (!parsedData.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: formatValidationErrors(parsedData.error.issues),
    };
  }

  try {
    // Prepare the API request body
    const requestBody = {
      ...parsedData.data,
      image: imageUrl, // Ensure we're using the uploaded image URL
      subcategories: JSON.stringify(subcategoriesData), // Send as JSON string
    };

    // Make the API request to your backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData: ApiResponse<null> = await response.json();
      return {
        success: false,
        message: errorData.message || "Failed to create category",
        errors: errorData.errors || {},
      };
    }

    const data: ApiResponse<Category> = await response.json();

    // Revalidate the categories page
    revalidatePath("/categories");

    return {
      success: true,
      message: "Category created successfully",
      data: data.data,
    };
  } catch (error) {
    console.error("Error in addCategory:", error);
    return {
      success: false,
      message: "An unexpected error occurred",
      errors: {
        general: ["An unexpected error occurred. Please try again."],
      },
    };
  }
}