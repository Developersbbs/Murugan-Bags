
import axiosInstance from "@/helpers/axiosInstance";
import { ApiResponse } from "@/types/api";

export interface ReportParams {
    startDate?: Date;
    endDate?: Date;
    minPrice?: string;
    maxPrice?: string;
    categoryId?: string;
}

export const getWishlistCartStats = async (params?: ReportParams) => {
    try {
        const queryParams = new URLSearchParams();
        if (params) {
            if (params.startDate) queryParams.append('startDate', params.startDate.toISOString());
            if (params.endDate) queryParams.append('endDate', params.endDate.toISOString());
            if (params.minPrice) queryParams.append('minPrice', params.minPrice);
            if (params.maxPrice) queryParams.append('maxPrice', params.maxPrice);
            if (params.categoryId) queryParams.append('categoryId', params.categoryId);
        }

        const { data } = await axiosInstance.get(`/api/reports/wishlist-cart-stats?${queryParams.toString()}`);

        if (!data.success) {
            throw new Error(data.message || "Failed to fetch report data");
        }

        return data;
    } catch (error: any) {
        console.error("Error fetching wishlist/cart stats:", error);
        throw error.response?.data?.error || error.message || "Failed to fetch report data";
    }
};

export const getProductInterestDetails = async (productId: string) => {
    try {
        const { data } = await axiosInstance.get(`/api/reports/product-interest/${productId}`);

        if (!data.success) {
            throw new Error(data.message || "Failed to fetch product interest details");
        }

        return data;
    } catch (error: any) {
        throw error.response?.data?.error || error.message || "Failed to fetch details";
    }
};
