import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRightIcon,
  SparklesIcon,
  TagIcon,
  ShoppingBagIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useGetCategoriesQuery } from '../../redux/services/categories';

const Categories = () => {
  const { data: categoriesData, isLoading, error, isError } = useGetCategoriesQuery();
  const categories = categoriesData?.data || [];
  const [hoveredCategory, setHoveredCategory] = useState(null);

  useEffect(() => {
    console.log('Categories Data:', categoriesData);
    console.log('Error:', error);
    console.log('Is Loading:', isLoading);
  }, [categoriesData, error, isLoading]);
 
  if (isLoading) {
    return (
      <div className="py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 rounded-2xl h-40 mb-4"></div>
              <div className="bg-gray-200 rounded h-4 mb-2"></div>
              <div className="bg-gray-200 rounded h-3 w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md mx-auto">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
            <TagIcon className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Unable to load categories</h3>
          <p className="text-red-700 mb-4">
            {error?.data?.error || error?.error || 'Something went wrong while loading categories'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <ArrowRightIcon className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 max-w-md mx-auto">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mx-auto mb-4">
            <ShoppingBagIcon className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Categories Available</h3>
          <p className="text-gray-600">Categories will appear here once they're added to the store.</p>
        </div>
      </div>
    );
  }
  const defaultImage = '/images/products/placeholder-product.svg';

  return (
    <div className="relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-3xl"></div>

      <div className="relative">
        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {categories.map((category, index) => (
            <Link
              key={category._id}
              to={`/products/category/${category.slug || category._id}`}
              className="group relative"
              onMouseEnter={() => setHoveredCategory(category._id)}
              onMouseLeave={() => setHoveredCategory(null)}
            >
              <div className={`relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-2 ${hoveredCategory === category._id ? 'ring-2 ring-blue-500/20' : ''
                }`}>
                {/* Category Image */}
                <div className="relative mb-4">
                  <div className="w-full h-24 md:h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden group-hover:shadow-lg transition-shadow">
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = defaultImage;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                        <div className="text-center">
                          <TagIcon className="h-8 w-8 text-gray-400 mx-auto mb-1" />
                          <span className="text-xs text-gray-500 font-medium">{category.name}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hover Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl transition-opacity duration-300 ${hoveredCategory === category._id ? 'opacity-100' : 'opacity-0'
                    }`}>
                    <div className="absolute bottom-2 right-2">
                      <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-lg">
                        <ArrowRightIcon className="h-3 w-3 text-gray-700" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Info */}
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 text-sm md:text-base mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {category.name}
                  </h3>

                  {/* Product Count (if available) */}
                  {category.product_count && (
                    <p className="text-xs text-gray-500 mb-2">
                      {category.product_count} {category.product_count === 1 ? 'product' : 'products'}
                    </p>
                  )}

                  {/* Shop Now Button */}
                  <div className={`inline-flex items-center text-xs font-medium text-blue-600 transition-all duration-300 ${hoveredCategory === category._id ? 'translate-x-1' : ''
                    }`}>
                    <span>Shop Now</span>
                    <ChevronRightIcon className="h-3 w-3 ml-1" />
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className={`absolute top-3 left-3 transition-opacity duration-300 ${hoveredCategory === category._id ? 'opacity-100' : 'opacity-0'
                  }`}>
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-1">
                    <SparklesIcon className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Categories Button */}
        {categories.length >= 6 && (
          <div className="text-center mt-12">
            <Link
              to="/categories"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <TagIcon className="h-5 w-5 mr-2" />
              View All Categories
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

// Add some custom CSS for line-clamp if not available
const styles = `
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('category-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'category-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default Categories;
