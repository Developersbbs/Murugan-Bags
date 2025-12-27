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
    const params = new URLSearchParams(location.search);
    const currentRating = params.get('rating');

    if (currentRating === String(rating)) {
      params.delete('rating');
    } else {
      params.set('rating', rating);
    }

    // Reset to first page
    params.delete('page');
    setSearchParams(params);

    // Also notify parent if needed, but URL change effectively drives state in parent
    if (onFilterChange) {
      onFilterChange({
        rating: currentRating === String(rating) ? null : rating
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 max-w-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-6 bg-rose-500 rounded-full inline-block"></span>
            Filters
          </h3>
          {(categoryFilter || subcategoryFilter || colorFilter || filters.rating) && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 uppercase tracking-wider transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {/* Categories Section */}
        <div className="p-5">
          <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Categories</h4>

          {/* Category Search Input */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="block w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-slate-400"
              value={categorySearchTerm}
              onChange={(e) => setCategorySearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredCategories.map((category) => (
              <div key={category._id} className="group">
                <div
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-200 ${categoryFilter === category._id ? 'bg-rose-50 text-rose-700 font-medium' : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  onClick={() => handleFilterSelect('category', category._id)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm">{category.name}</span>
                  </div>

                  {category.subcategories?.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategory(category._id);
                      }}
                      className={`p-1 rounded-md transition-colors ${categoryFilter === category._id ? 'text-rose-500 hover:bg-rose-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                    >
                      {expandedCategories[category._id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}
                </div>

                {/* Subcategories */}
                {category.subcategories?.length > 0 && expandedCategories[category._id] && (
                  <div className="ml-4 mt-1 border-l-2 border-slate-100 pl-2 space-y-1">
                    {category.subcategories
                      .filter(subcategory =>
                        !categorySearchTerm.trim() ||
                        subcategory.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
                      )
                      .map((subcategory) => (
                        <div
                          key={subcategory._id}
                          className={`flex items-center p-2 cursor-pointer rounded-md text-sm transition-colors ${subcategoryFilter === subcategory._id ? 'text-rose-600 bg-rose-50 font-medium' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                            }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFilterSelect('subcategory', subcategory._id);
                          }}
                        >
                          <span>{subcategory.name}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}

            {filteredCategories.length === 0 && categorySearchTerm.trim() && (
              <div className="text-center py-8 text-slate-400 text-sm">
                No categories found
              </div>
            )}
          </div>
        </div>

        {/* Price Range Section */}
        <div className="p-5">
          <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Price Range</h4>
          <PriceRangeSlider
            min={0}
            max={100000}
            step={100}
            value={[filters.priceRange?.min || 0, filters.priceRange?.max || 100000]}
            onChange={handlePriceRangeChange}
          />
        </div>

        {/* Color Filter Section */}
        <div className="p-5">
          <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Color</h4>

          <div className="flex flex-col space-y-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => handleFilterSelect('color', color)}
                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border flex items-center justify-between group
                  ${colorFilter === color
                    ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm'
                    : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full border border-slate-200 shadow-sm"
                    style={{ backgroundColor: color.toLowerCase() }}
                  ></span>
                  <span className="capitalize">{color}</span>
                </div>

                {colorFilter === color && (
                  <svg className="w-4 h-4 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {colors.length === 0 && (
            <div className="text-center py-4 text-slate-400 text-sm">
              No colors available
            </div>
          )}
        </div>

        {/* Rating Section */}
        <div className="p-5">
          <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Rating</h4>

          <div className="space-y-2">
            {[4, 3, 2, 1].map((rating) => (
              <div
                key={rating}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${filters.rating === rating
                  ? 'bg-amber-50 text-amber-800'
                  : 'hover:bg-slate-50 text-slate-600'
                  }`}
                onClick={() => handleRatingFilter(rating)}
              >
                <div className="flex items-center space-x-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < rating ? 'text-amber-400' : 'text-slate-200'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-medium">{rating} Stars & Up</span>
                </div>

                {filters.rating === rating && (
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarFilters;
