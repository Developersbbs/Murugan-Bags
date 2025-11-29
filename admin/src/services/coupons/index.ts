import axiosInstance from "@/helpers/axiosInstance";
import {
  Coupon,
  PaginatedResponse,
} from "@/types/api";

export interface FetchCouponsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export async function fetchCoupons({
  page = 1,
  limit = 10,
  search,
}: FetchCouponsParams): Promise<PaginatedResponse<Coupon>> {
  const params = new URLSearchParams();
  
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  if (search) params.append('search', search);

  const { data } = await axiosInstance.get(`/api/coupons?${params.toString()}`);
  return data;
}
