"use server";

import { serverAxiosInstance } from "@/helpers/axiosInstance";

export async function getReviews(params: any = {}) {
    try {
        const { page = 1, limit = 10, status, search } = params;

        let query = `?page=${page}&limit=${limit}`;
        if (status) query += `&status=${status}`;
        if (search) query += `&search=${search}`;

        const { data } = await serverAxiosInstance.get(`/api/ratings/admin/all${query}`);

        if (data.success) {
            return {
                data: data.data, // list of reviews
                pagination: data.pagination
            };
        }
        return { error: "Failed to fetch reviews" };
    } catch (error: any) {
        return {
            error: error.response?.data?.error || "Failed to fetch reviews"
        };
    }
}

export async function updateReviewStatus(id: string, status: string) {
    try {
        const { data } = await serverAxiosInstance.patch(`/api/ratings/admin/${id}/status`, { status });
        if (data.success) {
            return { success: true };
        }
        return { error: "Failed to update status" };
    } catch (error: any) {
        return {
            error: error.response?.data?.error || "Failed to update status"
        };
    }
}

export async function deleteReview(id: string) {
    try {
        const { data } = await serverAxiosInstance.delete(`/api/ratings/admin/${id}`);
        if (data.success) {
            return { success: true };
        }
        return { error: "Failed to delete review" };
    } catch (error: any) {
        return {
            error: error.response?.data?.error || "Failed to delete review"
        };
    }
}
