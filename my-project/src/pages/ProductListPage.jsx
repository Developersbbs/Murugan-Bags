import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useGetProductsQuery } from '../redux/services/products';
import ProductCard from '../components/product/ProductCard';
import SidebarFilters from '../components/home/SidebarFilters';
import { Filter, X, Search, ChevronLeft, ChevronRight, Grid3X3, List } from 'lucide-react';

import { useGetCategoriesQuery } from '../redux/services/categories';

// Number of products per page
const PER_PAGE_OPTIONS = [9, 18, 27, 36];

const ProductListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const [sortOption, setSortOption] = useState('featured');
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const lim = parseInt(searchParams.get('limit') || '9', 10);
    return PER_PAGE_OPTIONS.includes(lim) ? lim : 9;
  });
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    category: null,
    subcategory: null,
    priceRange: { min: 0, max: 100000 },
    rating: null,
    inStock: false,
    color: null,
  });
  // Track the previous filter key so we can detect a GENUINE filter change
  // vs. the initial mount. This correctly handles React Strict Mode's double
  // effect invocation — we only reset page when the key actually changes from
  // a previous non-null snapshot.
  const prevFilterParamsKey = useRef(null);

  // Fetch categories for filter display
  const { data: categoriesData } = useGetCategoriesQuery();
  const categories = useMemo(() => categoriesData?.data || [], [categoriesData]);

  // Read current page from URL (e.g. ?page=2)
  const pageFromUrl = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = isNaN(pageFromUrl) || pageFromUrl < 1 ? 1 : pageFromUrl;

  // Fetch current page from server – real server-side pagination
  const { data: apiResponse, isLoading, error, isError } = useGetProductsQuery({
    page: currentPage,
    limit: itemsPerPage,
    sort: sortOption === 'featured' ? '-createdAt' :
      sortOption === 'price-low' ? 'price' :
        sortOption === 'price-high' ? '-price' :
          '-createdAt',
    search: searchTerm || undefined,
    category: filters.category || undefined,
  });

  // Sync filters state with URL parameters
  // Build a stable key from only the filter-relevant params so pagination
  // only resets when actual filters change, not on page-number clicks.
  const filterParamsKey = [
    searchParams.get('category'),
    searchParams.get('subcategory'),
    searchParams.get('rating'),
    searchParams.get('color'),
    searchParams.get('search'),
  ].join('|');

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
    if (searchParam !== null) {
      setSearchTerm(searchParam);
    }

    // Only reset to page 1 when filters genuinely change from a previously
    // recorded state. On the very first render (prevFilterParamsKey === null)
    // we record the key without resetting — this lets bookmarked/shared
    // ?page=N URLs work and is also safe under React Strict Mode's double
    // effect invocation (second invocation sees the same key and doesn't
    // trigger a reset either).
    if (prevFilterParamsKey.current === null) {
      // First commit — just record the baseline, do NOT reset page.
      prevFilterParamsKey.current = filterParamsKey;
      return;
    }

    if (prevFilterParamsKey.current !== filterParamsKey) {
      // A genuine filter change — update baseline and reset to page 1.
      prevFilterParamsKey.current = filterParamsKey;

      // Scroll to top when filters change
      window.scrollTo(0, 0);

      const newParams = new URLSearchParams(searchParams);
      if (newParams.get('page') !== '1') {
        newParams.set('page', '1');
        navigate({ search: newParams.toString() }, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterParamsKey]);


  // Extract products from the API response
  const allProducts = React.useMemo(() => {
    try {
      if (isError || !apiResponse) return [];
      let products = [];
      if (Array.isArray(apiResponse)) {
        products = apiResponse.filter(p => p && typeof p === 'object');
      } else if (apiResponse && typeof apiResponse === 'object') {
        if (apiResponse.success && apiResponse.data) {
          products = Array.isArray(apiResponse.data)
            ? apiResponse.data
            : Array.isArray(apiResponse.data?.products)
              ? apiResponse.data.products
              : [];
        } else if (Array.isArray(apiResponse.products)) {
          products = apiResponse.products;
        } else if (Array.isArray(apiResponse.data)) {
          products = apiResponse.data;
        }
      }
      return products.filter(p => p && typeof p === 'object');
    } catch {
      return [];
    }
  }, [apiResponse, isError]);

  // Server pagination metadata
  const serverTotalPages = apiResponse?.totalPages || 1;
  const serverTotalItems = apiResponse?.totalItems || allProducts.length;
  const serverPrevPage = apiResponse?.prevPage || null;
  const serverNextPage = apiResponse?.nextPage || null;


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

  // Apply client-side filters (color, rating, price, inStock, subcategory) on top of server results
  // Category and search are already filtered server-side
  const { products, totalItems, totalPages } = useMemo(() => {
    if (!allProducts || allProducts.length === 0) {
      return { products: [], totalPages: serverTotalPages, totalItems: serverTotalItems };
    }

    // Apply remaining client-side filters
    let filtered = allProducts.filter(product => {
      if (!product || !product.name) return false;

      // Subcategory filter (not sent to server)
      const matchesSubcategory = !filters.subcategory ||
        (product.categories && product.categories.some(cat =>
          cat.subcategories?.some(sub =>
            sub.name === filters.subcategory ||
            String(sub._id) === String(filters.subcategory)
          )
        ));

      // Price range filter
      const price = Number(product.selling_price || product.salePrice || product.price || 0);
      const matchesPrice = price >= filters.priceRange.min && price <= filters.priceRange.max;

      // Rating filter
      const rating = Number(product.averageRating || 0);
      const matchesRating = !filters.rating || rating >= filters.rating;

      // Color filter (not sent to server)
      const matchesColor = !filters.color ||
        (product.color && product.color.toLowerCase() === filters.color.toLowerCase()) ||
        (product.product_variants?.some(v => {
          const attrs = v.attributes || {};
          const colorVal = attrs.color || attrs.Color || attrs.colour || attrs.Colour || '';
          return typeof colorVal === 'string' && colorVal.toLowerCase() === filters.color.toLowerCase();
        }));

      // In stock filter
      const matchesInStock = !filters.inStock ||
        product.baseStock > 0 ||
        product.product_variants?.some(v => v.stock > 0);

      return matchesSubcategory && matchesPrice && matchesRating && matchesColor && matchesInStock;
    });

    // Apply sort within current page
    filtered = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'price-low':
          return Number(a.selling_price || 0) - Number(b.selling_price || 0);
        case 'price-high':
          return Number(b.selling_price || 0) - Number(a.selling_price || 0);
        case 'newest':
          return new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt);
        default:
          return new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt);
      }
    });

    return {
      products: filtered.map(product => ({ ...product })),
      totalPages: serverTotalPages,
      totalItems: serverTotalItems,
    };
  }, [allProducts, filters, sortOption, serverTotalPages, serverTotalItems]);


  const clearFilter = (type, e) => {
    e.preventDefault();
    if (type === 'category') {
      setFilters(prev => ({ ...prev, category: null, subcategory: null }));
      // Update URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('category');
      newSearchParams.delete('subcategory');
      newSearchParams.set('page', '1');
      navigate({ search: newSearchParams.toString() });
    } else if (type === 'subcategory') {
      setFilters(prev => ({ ...prev, subcategory: null }));
      // Update URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('subcategory');
      newSearchParams.set('page', '1');
      navigate({ search: newSearchParams.toString() });
    } else if (type === 'rating') {
      setFilters(prev => ({ ...prev, rating: null }));
      // Update URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('rating');
      newSearchParams.set('page', '1');
      navigate({ search: newSearchParams.toString() });
    } else if (type === 'color') {
      setFilters(prev => ({ ...prev, color: null }));
      // Update URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('color');
      newSearchParams.set('page', '1');
      navigate({ search: newSearchParams.toString() });
    } else if (type === 'search') {
      setSearchTerm('');
      // Update URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('search');
      newSearchParams.set('page', '1');
      navigate({ search: newSearchParams.toString() });
    }
  };

  const handleSortChange = (e) => {
    const newSortOption = e.target.value;
    setSortOption(newSortOption);
    // Reset to page 1 in URL
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', '1');
    navigate({ search: newParams.toString() }, { replace: true });
  };

  const handlePerPageChange = (e) => {
    const newLimit = parseInt(e.target.value, 10);
    setItemsPerPage(newLimit);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('limit', String(newLimit));
    newParams.set('page', '1');
    navigate({ search: newParams.toString() }, { replace: true });
  };

  const handlePageChange = (newPage) => {
    const clamped = Math.max(1, Math.min(newPage, serverTotalPages || 1));
    // Update URL — this triggers a new API fetch via RTK Query
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(clamped));
    navigate({ search: newParams.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Push search term into URL so it persists across page changes
    const newParams = new URLSearchParams(searchParams);
    if (searchTerm) {
      newParams.set('search', searchTerm);
    } else {
      newParams.delete('search');
    }
    newParams.set('page', '1');
    navigate({ search: newParams.toString() }, { replace: true });
  };

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value);
    // If the field is cleared, also clear it from the URL immediately
    if (!e.target.value) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('search');
      newParams.set('page', '1');
      navigate({ search: newParams.toString() }, { replace: true });
    }
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
      <div className="container mx-auto px-4 py-8">
        {/* Page Title - Safari Style Centered */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1a2b4c]">All Products</h1>
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
          <div className="mb-8 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider mr-2">Active Filters:</span>

            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-rose-50 text-rose-700 border border-rose-100 transition-all hover:bg-rose-100 hover:border-rose-200"
                >
                  <span className="opacity-70 mr-1.5 uppercase text-xs tracking-wider">{filter.type}:</span>
                  {filter.value}
                  <button
                    onClick={(e) => clearFilter(filter.type, e)}
                    className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-rose-200 text-rose-500 hover:text-rose-700 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              <button
                onClick={() => {
                  setFilters({
                    category: null,
                    subcategory: null,
                    priceRange: { min: 0, max: 100000 },
                    rating: null,
                    inStock: false,
                    color: null,
                  });
                  setSearchTerm('');
                  navigate({ search: '' });
                }}
                className="px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-colors ml-2"
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-5 lg:gap-6">
          {/* Filters sidebar - Fixed overlap by increasing top offset */}
          <div className="hidden lg:block space-y-6 sticky top-28 self-start pl-4">
            <SidebarFilters
              filters={filters}
              onFilterChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
            />
          </div>

          {/* Product section */}
          <div className="lg:col-span-4">

            {/* Top Bar: Count & Sort */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 text-sm text-gray-600">
              <div className="mr-auto mb-4 sm:mb-0">
                {totalItems || 0} products {searchTerm && ` for "${searchTerm}"`}
              </div>

              <div className="flex items-center gap-4">
                {/* Optional Search Bar */}
                <form onSubmit={handleSearch} className="hidden lg:block relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    className="w-48 pl-9 pr-4 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                  />
                </form>

                {/* View Mode Toggle Removed */}

                {/* Per-page selector */}
                <div className="flex items-center gap-2 relative">
                  <span className="text-gray-500 whitespace-nowrap">Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={handlePerPageChange}
                    className="border-none bg-transparent font-medium text-gray-900 focus:ring-0 cursor-pointer text-sm p-0 pr-6 appearance-none relative z-10"
                  >
                    {PER_PAGE_OPTIONS.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-900 z-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 relative">
                  <span className="text-gray-500 whitespace-nowrap">Sort by</span>
                  <select
                    value={sortOption}
                    onChange={handleSortChange}
                    className="border-none bg-transparent font-medium text-gray-900 focus:ring-0 cursor-pointer text-sm p-0 pr-6 appearance-none relative z-10"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-low">Price Low to High</option>
                    <option value="price-high">Price High to Low</option>
                    <option value="newest">Newest</option>
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-900 z-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            </div>
            {products && products.length > 0 ? (
              <>
                <div className={
                  viewMode === 'grid'
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
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

                {/* Pagination / Results info - always shown when there are products */}
                {totalItems > 0 && (
                  <div className="mt-10 flex items-center justify-between border-t border-gray-200 px-4 py-4 sm:px-6">
                    {/* Mobile: Prev / Next */}
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-500 self-center">
                        Page {currentPage} of {Math.max(1, totalPages)}
                      </span>
                      <button
                        onClick={() => handlePageChange(Math.min(Math.max(1, totalPages), currentPage + 1))}
                        disabled={currentPage >= Math.max(1, totalPages)}
                        className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>

                    {/* Desktop: full pagination */}
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing{' '}
                          <span className="font-medium">{totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span>
                          {' '}–{' '}
                          <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span>
                          {' '}of{' '}
                          <span className="font-medium">{totalItems}</span> results
                        </p>
                      </div>

                      {totalPages > 1 && (
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
                                    ? 'z-10 bg-rose-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600'
                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                                    }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}

                            <button
                              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage >= totalPages}
                              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="sr-only">Next</span>
                              <ChevronRight className="h-5 w-5" aria-hidden="true" />
                            </button>
                          </nav>
                        </div>
                      )}
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
    </div>
  );
};

export default ProductListPage;
