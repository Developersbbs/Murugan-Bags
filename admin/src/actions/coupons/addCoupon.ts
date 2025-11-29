"use server";

import { revalidatePath } from "next/cache";

import { serverAxiosInstance } from "@/helpers/axiosInstance";
import { couponFormSchema } from "@/app/(dashboard)/coupons/_components/form/schema";
import { formatValidationErrors } from "@/helpers/formatValidationErrors";
import { CouponServerActionResponse } from "@/types/server-action";

export async function addCoupon(
  formData: FormData
): Promise<CouponServerActionResponse> {
  const parsedData = couponFormSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    image: formData.get("image"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    isPercentageDiscount: formData.get("isPercentageDiscount") === "true",
    discountValue: formData.get("discountValue"),
  });

  if (!parsedData.success) {
    return {
      validationErrors: formatValidationErrors(
        parsedData.error.flatten().fieldErrors
      ),
    };
  }

  const { image, ...couponData } = parsedData.data;

  try {
    // Prepare form data for API call
    const apiFormData = new FormData();
    apiFormData.append("campaign_name", couponData.name);
    apiFormData.append("code", couponData.code);
    apiFormData.append("start_date", couponData.startDate.toISOString());
    apiFormData.append("end_date", couponData.endDate.toISOString());
    apiFormData.append("discount_type", couponData.isPercentageDiscount ? "percentage" : "fixed");
    apiFormData.append("discount_value", couponData.discountValue.toString());
    apiFormData.append("published", "false");

    if (image instanceof File && image.size > 0) {
      apiFormData.append("image", image);
    }

    const { data } = await serverAxiosInstance.post("/api/coupons", apiFormData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!data.success) {
      if (data.error?.includes("unique")) {
        return {
          validationErrors: {
            code: "This coupon code is already in use. Please create a unique code for your new coupon.",
          },
        };
      }
      console.error("API insert failed:", data.error);
      return { dbError: data.error || "Something went wrong. Please try again later." };
    }

    revalidatePath("/coupons");

    return { success: true, coupon: data.data };
  } catch (error: any) {
    console.error("Coupon creation error:", error);
    return {
      dbError: error.response?.data?.error || "Something went wrong. Please try again later."
    };
  }
}
