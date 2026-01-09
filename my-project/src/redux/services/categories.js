import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../config/api';

console.log('API URL:', API_BASE_URL); // Debug log

export const categoriesApi = createApi({
  reducerPath: 'categoriesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/categories`,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getCategories: builder.query({
      query: () => ({
        url: '/',
        params: {
          limit: 6,
          published: true,
        },
      }),
      transformResponse: (response, meta) => {
        console.log('Categories API Response:', response); // Debug log
        return {
          ...response,
          data: response.data.map(category => ({
            ...category,
            image_url: category.image_url || 'https://via.placeholder.com/300x300?text=No+Image',
          }))
        };
      },
      transformErrorResponse: (response) => {
        console.error('Categories API Error:', response);
        return response;
      },
    }),
  }),
});

export const { useGetCategoriesQuery } = categoriesApi;
