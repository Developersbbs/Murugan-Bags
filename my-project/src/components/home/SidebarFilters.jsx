import React, { useState, useEffect, useMemo } from 'react';
import { useGetCategoriesQuery } from '../../redux/services/categories';
import { useGetProductColorsQuery } from '../../redux/services/products';
import { useSearchParams, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import PriceRangeSlider from '../common/PriceRangeSlider';

const SidebarFilters = ({ filters = {}, onFilterChange }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { data: categoriesData } = useGetCategoriesQuery();
  const { data: colorsData } = useGetProductColorsQuery();
  const categories = categoriesData?.data || [];
  const colors = colorsData?.data || [];

  // State to track expanded categories
  const [expandedCategories, setExpandedCategories] = useState({});

  // State for category search
  const [categorySearchTerm, setCategorySearchTerm] = useState('');

  // Get current filters from URL
  const categoryFilter = searchParams.get('category') || '';
  const subcategoryFilter = searchParams.get('subcategory') || '';
  const ratingFilter = searchParams.get('rating') || '';
  const colorFilter = searchParams.get('color') || '';

  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Handle filter selection
  const handleFilterSelect = (type, value) => {
    const params = new URLSearchParams(location.search);

    if (type === 'category') {
      if (value === categoryFilter) {
        params.delete('category');
        params.delete('subcategory'); // Clear subcategory when category is deselected
      } else {
        params.set('category', value);
        params.delete('subcategory'); // Reset subcategory when category changes
      }
    } else if (type === 'subcategory') {
      if (value === subcategoryFilter) {
        params.delete('subcategory');
      } else {
        params.set('subcategory', value);
        // Ensure parent category is set when selecting a subcategory
        if (!categoryFilter && value) {
          const parentCategory = categories.find(cat =>
            cat.subcategories?.some(sub => sub._id === value)
          );
          if (parentCategory) {
            params.set('category', parentCategory._id);
          }
        }
      }
    } else if (type === 'color') {
      if (value === colorFilter) {
        params.delete('color');
      } else {
        params.set('color', value);
      }
    }

    // Reset to first page when filters change
    params.delete('page');
    setSearchParams(params);
  };

  // Handle price range changes
  const handlePriceRangeChange = (newRange) => {
    console.log('Price range changed:', newRange);
    if (onFilterChange) {
      const filterUpdate = {
        priceRange: { min: newRange[0], max: newRange[1] }
      };
      console.log('Calling onFilterChange with:', filterUpdate);
      onFilterChange(filterUpdate);
    } else {
      console.log('onFilterChange is not available');
    }
  };

  // Handle rating filter changes
  const handleRatingFilter = (rating) => {
    const currentRating = filters.rating;
    const newRating = currentRating === rating ? null : rating; // Toggle off if same rating selected

    if (onFilterChange) {
      onFilterChange({
        rating: newRating
      });
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchParams({});
    // Reset price range and rating to default
    if (onFilterChange) {
      onFilterChange({
        priceRange: { min: 0, max: 100000 },
        rating: null
      });
    }
  };

  // Filtered categories based on search term
  const filteredCategories = useMemo(() => {
    if (!categorySearchTerm.trim()) {
      return categories;
    }

    const searchLower = categorySearchTerm.toLowerCase();
    return categories.filter(category => {
      // Check if category name matches
      const categoryMatches = category.name.toLowerCase().includes(searchLower);

      // Check if any subcategory name matches
      const subcategoryMatches = category.subcategories?.some(sub =>
        sub.name.toLowerCase().includes(searchLower)
      );

      return categoryMatches || subcategoryMatches;
    });
  }, [categories, categorySearchTerm]);

  // Expand categories with active subcategories
  useEffect(() => {
    if (subcategoryFilter && categories.length > 0) {
      const parentCategory = categories.find(cat =>
        cat.subcategories?.some(sub => sub._id === subcategoryFilter)
      );
      if (parentCategory) {
        setExpandedCategories(prev => ({
          ...prev,
          [parentCategory._id]: true
        }));
      }
    }
  }, [subcategoryFilter, categories]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm w-full max-w-xs">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {(categoryFilter || subcategoryFilter || colorFilter || filters.rating) && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        <>
          {/* Categories Section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Categories</h4>

            {/* Category Search Input */}
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search categories..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={categorySearchTerm}
                onChange={(e) => setCategorySearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredCategories.map((category) => (
                <div key={category._id} className="group">
                  <div
                    className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-50 ${categoryFilter === category._id ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                    onClick={() => handleFilterSelect('category', category._id)}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full border-2 ${categoryFilter === category._id ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                        }`}></div>
                      <span className="text-sm">{category.name}</span>
                      {categoryFilter === category._id && (
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    {category.subcategories?.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategory(category._id);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {expandedCategories[category._id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    )}
                  </div>

                  {/* Subcategories */}
                  {category.subcategories?.length > 0 && expandedCategories[category._id] && (
                    <div className="ml-6 mt-2 space-y-1">
                      {category.subcategories
                        .filter(subcategory =>
                          !categorySearchTerm.trim() ||
                          subcategory.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
                        )
                        .map((subcategory) => (
                          <div
                            key={subcategory._id}
                            className={`flex items-center p-2 cursor-pointer rounded hover:bg-gray-50 ${subcategoryFilter === subcategory._id ? 'bg-purple-50 text-purple-700' : ''
                              }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFilterSelect('subcategory', subcategory._id);
                            }}
                          >
                            <div className={`w-2 h-2 rounded-full mr-3 ${subcategoryFilter === subcategory._id ? 'bg-purple-500' : 'bg-gray-300'
                              }`}></div>
                            <span className="text-sm">{subcategory.name}</span>
                            {subcategoryFilter === subcategory._id && (
                              <svg className="w-3 h-3 ml-auto text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}

              {filteredCategories.length === 0 && categorySearchTerm.trim() && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No categories found matching "{categorySearchTerm}"
                </div>
              )}
            </div>
          </div>

          {/* Price Range Section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Price Range</h4>

            <PriceRangeSlider
              min={0}
              max={100000}
              step={100}
              value={[filters.priceRange?.min || 0, filters.priceRange?.max || 100000]}
              onChange={handlePriceRangeChange}
            />
          </div>

          {/* Color Filter Section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Color</h4>

            <div className="grid grid-cols-3 gap-3">
              {colors.map((color) => (
                <div
                  key={color}
                  className={`relative flex flex-col items-center p-2 rounded cursor-pointer hover:bg-gray-50 transition-colors ${colorFilter === color ? 'bg-blue-50 ring-2 ring-blue-500' : ''
                    }`}
                  onClick={() => handleFilterSelect('color', color)}
                >
                  <div
                    className={`w-10 h-10 rounded-full border-2 mb-1 ${colorFilter === color ? 'border-blue-500' : 'border-gray-300'
                      }`}
                    style={{
                      backgroundColor: color.toLowerCase(),
                      boxShadow: colorFilter === color ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none'
                    }}
                  >
                    {colorFilter === color && (
                      <div className="flex items-center justify-center h-full">
                        <svg className="w-5 h-5 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className={`text-xs text-center capitalize ${colorFilter === color ? 'font-semibold text-blue-700' : 'text-gray-600'
                    }`}>
                    {color}
                  </span>
                </div>
              ))}
            </div>

            {colors.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No colors available
              </div>
            )}
          </div>

          {/* Rating Section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Customer Rating</h4>

            <div className="space-y-2">
              {[4, 3, 2, 1].map((rating) => (
                <div
                  key={rating}
                  className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 border-l-4 ${filters.rating === rating
                    ? 'bg-yellow-50 border-yellow-400'
                    : 'border-transparent'
                    }`}
                  onClick={() => handleRatingFilter(rating)}
                >
                  <div className="flex items-center mr-3">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{rating} Stars & Up</span>
                  {filters.rating === rating && (
                    <svg className="w-4 h-4 ml-auto text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      </div>
    </div>
  );
};

export default SidebarFilters;
