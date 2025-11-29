import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetProductByIdQuery, useGetProductBySlugQuery } from '../redux/services/products';
import ProductDetails from '../components/product/ProductDetails';

const ProductDetailPage = () => {
  const [cartUpdated, setCartUpdated] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Validate the ID/slug
  const isValidId = useMemo(() => {
    // Check if ID exists and is not empty string
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return false;
    }
    return true;
  }, [id]);
  
  // Try to fetch by slug first if the ID is not a valid MongoDB ID
  const isMongoId = useMemo(() => {
    if (!isValidId) return false;
    // Simple check for MongoDB ID format (24 hex characters)
    return /^[0-9a-fA-F]{24}$/.test(id);
  }, [id, isValidId]);
  
  const { 
    data: productBySlug, 
    isError: slugError,
    isSuccess: slugSuccess,
    isLoading: isLoadingSlug
  } = useGetProductBySlugQuery(id, { 
    skip: !isValidId || isMongoId // Skip if ID is a MongoDB ID
  });
  
  // If slug fetch fails or if it's a MongoDB ID, try by ID
  const { 
    data: productById, 
    isError: idError,
    isSuccess: idSuccess,
    isLoading: isLoadingId
  } = useGetProductByIdQuery(id, { 
    skip: !isValidId || (!isMongoId && !slugError) // Skip if not a MongoDB ID and slug didn't error
  });

  useEffect(() => {
    // If ID is invalid or both fetches fail, redirect to 404
    if (!isValidId || (slugError && (idError || !isMongoId))) {
      navigate('/404');
    }
  }, [slugError, idError, id, navigate, isValidId, isMongoId]);

  // Determine which product data to use
  const product = productBySlug?.data || productById?.data;
  const isLoading = (isLoadingSlug && !isMongoId) || (isLoadingId && (isMongoId || slugError));
  const isError = (!isMongoId && slugError && (idError || !isMongoId)) || (isMongoId && idError);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800">Product Not Found</h1>
          <p className="text-gray-600 mt-2">The product you're looking for doesn't exist or has been removed.</p>
          <button 
            onClick={() => navigate('/products')}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <ProductDetails 
        product={product} 
        isLoading={isLoading} 
        isError={isError}
        onCartUpdate={() => setCartUpdated(prev => !prev)}
      />
    </div>
  );
};

export default ProductDetailPage;
