"use server";

import { revalidatePath } from "next/cache";

import { serverAxiosInstance } from "@/helpers/axiosInstance";
import { couponBulkFormSchema } from "@/app/(dashboard)/coupons/_components/form/schema";
import { formatValidationErrors } from "@/helpers/formatValidationErrors";
import { VServerActionResponse } from "@/types/server-action";

export async function editCoupons(
  couponIds: string[],
  formData: FormData
): Promise<VServerActionResponse> {
  const parsedData = couponBulkFormSchema.safeParse({
    published: !!(formData.get("published") === "true"),
  });

  if (!parsedData.success) {
    return {
      validationErrors: formatValidationErrors(
        parsedData.error.flatten().fieldErrors
      ),
    };
  }

  const { published } = parsedData.data;

  try {
    const { data } = await serverAxiosInstance.put("/api/coupons/bulk", {
      ids: couponIds,
      published,
    });

    if (!data.success) {
      console.error("API bulk update failed:", data.error);
      return { dbError: data.error || "Something went wrong. Please try again later." };
    }

    revalidatePath("/coupons");

    return { success: true };
  } catch (error: any) {
    console.error("Coupons bulk update error:", error);
    return {
      dbError: error.response?.data?.error || "Something went wrong. Please try again later."
    };
  }
}
