"use server";

import { revalidatePath } from "next/cache";

import { serverAxiosInstance } from "@/helpers/axiosInstance";
import { customerFormSchema } from "@/app/(dashboard)/customers/_components/form/schema";
import { formatValidationErrors } from "@/helpers/formatValidationErrors";
import { CustomerServerActionResponse } from "@/types/server-action";

export async function editCustomer(
  customerId: string,
  formData: FormData
): Promise<CustomerServerActionResponse> {
  const parsedData = customerFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsedData.success) {
    return {
      validationErrors: formatValidationErrors(
        parsedData.error.flatten().fieldErrors
      ),
    };
  }

  const customerData = parsedData.data;

  try {
    const { data } = await serverAxiosInstance.put(`/api/customers/${customerId}`, {
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
    });

    if (!data.success) {
      console.error("API update failed:", data.error);
      return { dbError: data.error || "Something went wrong. Please try again later." };
    }

    revalidatePath("/customers");
    revalidatePath(`/customer-orders/${data.data.id}`);

    return { success: true, customer: data.data };
  } catch (error: any) {
    console.error("Customer update error:", error);
    return {
      dbError: error.response?.data?.error || "Something went wrong. Please try again later."
    };
  }
}
