import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useGetProductsQuery } from '../redux/services/products';
import ProductCard from '../components/product/ProductCard';
import SidebarFilters from '../components/home/SidebarFilters';
import { Filter, X, Search, ChevronLeft, ChevronRight, Grid3X3, List } from 'lucide-react';

import { useGetCategoriesQuery } from '../redux/services/categories';

// Number of products per page
const ITEMS_PER_PAGE = 12;

const ProductListPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filters, setFilters] = useState({
    category: null,
    subcategory: null,
    priceRange: { min: 0, max: 100000 }, // Increased max price to accommodate all products
    rating: null,
    inStock: false,
    color: null,
  });

  // Fetch categories for filter display
  const { data: categoriesData } = useGetCategoriesQuery();
  const categories = useMemo(() => categoriesData?.data || [], [categoriesData]);

  // Fetch all products with error handling
  const { data: apiResponse, isLoading, error, isError } = useGetProductsQuery({
    limit: 1000,
    sort: sortOption === 'featured' ? '-createdAt' :
      sortOption === 'price-low' ? 'price' :
        sortOption === 'price-high' ? '-price' :
          '-createdAt' // default to newest
  });

  // Sync filters state with URL parameters
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const subcategoryParam = searchParams.get('subcategory');
    const ratingParam = searchParams.get('rating');
    const colorParam = searchParams.get('color');
    const searchParam = searchParams.get('search');

    setFilters(prev => ({
      ...prev,
      category: categoryParam || null,
      subcategory: subcategoryParam || null,
      rating: ratingParam ? parseInt(ratingParam) : null,
      color: colorParam || null,
    }));

    // Set search term from URL if present
    if (searchParam) {
      setSearchTerm(searchParam);
    }

    // Reset to first page when filters change
    setCurrentPage(1);
  }, [searchParams]);

  // Log the API response to debug
  useEffect(() => {
    console.log('API Response:', apiResponse);
    if (isError) {
      console.error('Error fetching products:', error);
    }
  }, [apiResponse, isError, error]);

  // Extract products from the API response and expand variants
  const allProducts = React.useMemo(() => {
    try {
      // If we have an error or no response yet, return empty array
      if (isError || !apiResponse) {
        console.log('No valid API response or error occurred');
        return [];
      }

      let products = [];

      // Check different possible response structures
      if (Array.isArray(apiResponse)) {
        if (apiResponse.length > 0) {
          console.log('First product structure:', apiResponse[0]);
        }
        products = apiResponse.filter(p => p && typeof p === 'object');
      }

      else if (apiResponse && typeof apiResponse === 'object') {
        // Handle success response with data
        if (apiResponse.success && apiResponse.data) {
          if (Array.isArray(apiResponse.data)) {
            products = apiResponse.data.filter(p => p && typeof p === 'object');
          }
          else if (Array.isArray(apiResponse.data.products)) {
            products = apiResponse.data.products.filter(p => p && typeof p === 'object');
          }
          else if (apiResponse.data.data && Array.isArray(apiResponse.data.data)) {
            products = apiResponse.data.data.filter(p => p && typeof p === 'object');
          }
        }

        // Handle direct products array
        else if (Array.isArray(apiResponse.products)) {
          products = apiResponse.products.filter(p => p && typeof p === 'object');
        }

        // Handle direct data array
        else if (apiResponse.data) {
          if (Array.isArray(apiResponse.data)) {
            products = apiResponse.data.filter(p => p && typeof p === 'object');
          }
          else if (Array.isArray(apiResponse.data.products)) {
            products = apiResponse.data.products.filter(p => p && typeof p === 'object');
          }
        }
      }

      // Log warning only if we couldn't extract products
      if (products.length === 0 && apiResponse) {
        console.warn('Unexpected API response structure:', apiResponse);
      }

      // Transform products data to show variants as separate items (like admin)
      const transformedProducts = [];
      products.forEach(product => {
        if (product.product_structure === 'variant' && product.product_variants && product.product_variants.length > 0) {
          // For variant products, create separate items for each variant
          product.product_variants.forEach((variant, index) => {
            transformedProducts.push({
              ...product,
              // Override with variant-specific data (similar to admin approach)
              _id: `${product._id}-variant-${index}`, // Unique ID for each variant
              name: `${product.name} - ${variant.name || variant.slug}`,
              slug: variant.slug,
              sku: variant.sku,
              cost_price: variant.cost_price,
              selling_price: variant.selling_price || variant.salesPrice,
              baseStock: variant.stock,
              minStock: variant.minStock,
              status: variant.status,
              published: variant.published,
              image_url: variant.images && variant.images.length > 0 ? variant.images : product.image_url,
              // Keep variant data for reference
              _isVariant: true,
              _variantIndex: index,
              _variantData: variant,
              _originalProductId: product._id,
              _parentProduct: product,
              // Keep original product info for navigation
              originalName: product.name,
              originalDescription: product.description,
              originalCategories: product.categories,
              averageRating: product.averageRating,
              numReviews: product.numReviews,
              // Keep attributes for display
              attributes: variant.attributes
            });
          });
        } else {
          // For simple products, add as-is
          transformedProducts.push({
            ...product,
            _isVariant: false,
            _variantIndex: 0,
            isVariant: false
          });
        }
      });

      console.log('Transformed products count:', transformedProducts.length);
      return transformedProducts;

    } catch (error) {
      console.error('Error processing API response:', error);
      return [];
    }
  }, [apiResponse, isError]);

  // Get active filters for display
  const activeFilters = useMemo(() => {
    const activeFiltersList = [];

    if (filters.category) {
      const category = categories.find(c => c._id === filters.category);
      activeFiltersList.push({
        type: 'category',
        value: category ? category.name : filters.category,
        id: filters.category // Keep ID for clearing
      });
    }

    if (filters.subcategory) {
      // Find subcategory across all categories
      let subcategoryName = filters.subcategory;
      for (const cat of categories) {
        const sub = cat.subcategories?.find(s => s._id === filters.subcategory);
        if (sub) {
          subcategoryName = sub.name;
          break;
        }
      }
      activeFiltersList.push({
        type: 'subcategory',
        value: subcategoryName,
        id: filters.subcategory
      });
    }

    if (filters.rating) activeFiltersList.push({ type: 'rating', value: `${filters.rating} Stars & Up` });
    if (filters.search) activeFiltersList.push({ type: 'search', value: filters.search }); // Fixed: use filters.search if available or searchTerm
    if (searchTerm) activeFiltersList.push({ type: 'search', value: searchTerm });

    return activeFiltersList;
  }, [filters, searchTerm, categories]);

  // Destructure the memoized values
  const { products, totalPages, totalItems } = useMemo(() => {
    if (!allProducts || allProducts.length === 0) {
      return { products: [], totalPages: 0, totalItems: 0 };
    }

    // Apply filters
    let products = allProducts.filter(product => {
      if (!product || typeof product !== 'object') return false;

      // Ensure product has required fields
      if (!product.name) {
        return false;
      }

      // Search term filter
      const matchesSearch = searchTerm === '' ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      // Category filter
      const matchesCategory = !filters.category ||
        (product.categories && product.categories.some(cat =>
          cat.category?.name === filters.category ||
          cat.category?.slug === filters.category ||
          // Case insensitive checks
          (cat.category?.name && filters.category && cat.category.name.toLowerCase() === filters.category.toLowerCase()) ||
          (cat.category?.slug && filters.category && cat.category.slug.toLowerCase() === filters.category.toLowerCase()) ||
          String(cat.category?._id) === String(filters.category) ||
          (typeof cat.category === 'string' && cat.category === filters.category)
        ));

      // Subcategory filter
      const matchesSubcategory = !filters.subcategory ||
        (product.categories && product.categories.some(cat =>
          cat.subcategories?.some(sub =>
            sub.name === filters.subcategory ||
            String(sub._id) === String(filters.subcategory)
          )
        ));

      // ... rest of filters ...

      // Price range filter - try multiple price fields
      const price = Number(product.selling_price || product.salePrice || product.price || product.mrp || 0);
      const minPrice = Number(filters.priceRange.min);
      const maxPrice = Number(filters.priceRange.max);
      const matchesPrice = price >= minPrice && price <= maxPrice;

      // Rating filter
      const rating = Number(product.rating || product.averageRating || product.starRating || 0);
      const matchesRating = !filters.rating || rating >= filters.rating;

      // Color filter
      const matchesColor = !filters.color ||
        (product.color && product.color.toLowerCase() === filters.color.toLowerCase()) ||
        (product.attributes?.color && product.attributes.color.toLowerCase() === filters.color.toLowerCase());

      // In stock filter
      const matchesInStock = !filters.inStock ||
        (product.stockQuantity > 0) ||
        (product.baseStock > 0) ||
        (product.stock > 0) ||
        (product.variants && product.variants.some(v => v.stock > 0));

      return matchesSearch && matchesCategory && matchesSubcategory &&
        matchesPrice && matchesRating && matchesColor && matchesInStock;
    });

    // Apply sorting
    products = [...products].sort((a, b) => {
      switch (sortOption) {
        case 'price-low':
          return Number(a.selling_price || a.salePrice || a.price || a.mrp || 0) - Number(b.selling_price || b.salePrice || b.price || b.mrp || 0);
        case 'price-high':
          return Number(b.selling_price || b.salePrice || b.price || b.mrp || 0) - Number(a.selling_price || a.salePrice || a.price || a.mrp || 0);
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'featured':
        default:
          // Featured products first, then by creation date
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    // Calculate pagination
    const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedProducts = products.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return {
      products: paginatedProducts.map(product => ({
        ...product,
        // Ensure image URLs are properly formatted
        images: product.images?.map(img =>
          img.startsWith('http') ? img : `/uploads/${img}`
        ) || []
      })),
      totalPages,
      totalItems: products.length
    };
  }, [allProducts, searchTerm, filters, sortOption, currentPage]);

  const clearFilter = (type, e) => {
    e.preventDefault();
    if (type === 'category') {
      setFilters(prev => ({ ...prev, category: null, subcategory: null }));
      setCurrentPage(1);
      // Update URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('category');
      newSearchParams.delete('subcategory');
      navigate({ search: newSearchParams.toString() });
    } else if (type === 'subcategory') {
      setFilters(prev => ({ ...prev, subcategory: null }));
      setCurrentPage(1);
      // Update URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('subcategory');
      navigate({ search: newSearchParams.toString() });
    } else if (type === 'rating') {
      setFilters(prev => ({ ...prev, rating: null }));
      setCurrentPage(1);
      // Update URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('rating');
      navigate({ search: newSearchParams.toString() });
    } else if (type === 'color') {
      setFilters(prev => ({ ...prev, color: null }));
      setCurrentPage(1);
      // Update URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('color');
      navigate({ search: newSearchParams.toString() });
    } else if (type === 'search') {
      setSearchTerm('');
      setCurrentPage(1);
      // Update URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('search');
      navigate({ search: newSearchParams.toString() });
    }
  };

  const handleSortChange = (e) => {
    const newSortOption = e.target.value;
    setSortOption(newSortOption);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Search is handled by the filteredProducts memo
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <span className="ml-4 text-gray-600">Loading products...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center text-red-500 py-8 bg-red-50 rounded-lg border border-red-200">
          <h3 className="text-lg font-medium mb-2">Error loading products</h3>
          <p className="text-sm text-gray-600">Failed to load products. Please try again later.</p>
          <p className="text-xs text-gray-500 mt-2">Error: {error?.data?.message || error?.error || 'Unknown error'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center text-red-500 py-8 bg-red-50 rounded-lg border border-red-200">
          <h3 className="text-lg font-medium mb-2">Error loading products</h3>
          <p className="text-sm text-gray-600">Please try again later or refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">All Products</h1>
              <p className="text-sm text-gray-500 mt-1">
                {totalItems || 0} {totalItems === 1 ? 'product' : 'products'} found
                {searchTerm && ` for "${searchTerm}"`}
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } transition-colors`}
                title="Grid View"
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } transition-colors`}
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search and Sort Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </form>

            {/* Sort dropdown */}
            <div className="sm:w-64">
              <select
                value={sortOption}
                onChange={handleSortChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent cursor-pointer bg-white"
              >
                <option value="featured">Sort: Featured</option>
                <option value="price-low">Sort: Price Low to High</option>
                <option value="price-high">Sort: Price High to Low</option>
                <option value="newest">Sort: Newest</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile filter button */}
      <div className="lg:hidden mb-6">
        <button
          type="button"
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          onClick={() => setMobileFiltersOpen(true)}
        >
          <Filter className="mr-2 h-5 w-5 text-gray-500" aria-hidden="true" />
          Filters
          {activeFilters.length > 0 && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFilters.length}
            </span>
          )}
        </button>
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Active filters:</h3>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter, i) => (
              <span
                key={i}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {filter.type}: {filter.value}
                <button
                  onClick={(e) => clearFilter(filter.type, e)}
                  className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-200 hover:bg-blue-300"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-5 lg:gap-6">
        {/* Filters sidebar */}
        <div className="hidden lg:block space-y-6 sticky top-24 self-start pl-36">
          <SidebarFilters
            filters={filters}
            onFilterChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
          />
        </div>

        {/* Product grid */}
        <div className="lg:col-span-4 pr-36">
          {products && products.length > 0 ? (
            <>
              <div className={
                viewMode === 'grid'
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }>
                {products.map((product) => (
                  <div key={product._id} className={
                    viewMode === 'grid'
                      ? "h-full flex"
                      : ""
                  }>
                    <ProductCard
                      product={product}
                      className={viewMode === 'grid' ? "flex-1 flex flex-col" : ""}
                      viewMode={viewMode}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}
                        </span>{' '}
                        of <span className="font-medium">{totalItems}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Previous</span>
                          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>

                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          // Show first page, last page, current page, and pages around current page
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === pageNum
                                ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                                }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Next</span>
                          <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
              <p className="mt-1 text-sm text-gray-500">
                We couldn't find any products matching your filters.
              </p>
              <div className="mt-6">
                <Link
                  to="/products"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear all filters
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductListPage;
