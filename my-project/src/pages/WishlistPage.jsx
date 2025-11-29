import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  HeartIcon, 
  ShoppingBagIcon, 
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ChevronDownIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import WishlistItem from '../components/wishlist/WishlistItem';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import UnauthenticatedEmptyState from '../components/common/UnauthenticatedEmptyState';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { items: wishlistItems, removeFromWishlist, clearWishlist, loading } = useWishlist();
  const { addToCart } = useCart();
  const [isAddingAllToCart, setIsAddingAllToCart] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'name', 'price-low', 'price-high'
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });

  // Filter and sort wishlist items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...wishlistItems];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(item => {
        const price = item.price || 0;
        const min = priceRange.min ? parseFloat(priceRange.min) : 0;
        const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
        return price >= min && price <= max;
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'oldest':
          return new Date(a.addedAt || 0) - new Date(b.addedAt || 0);
        case 'newest':
        default:
          return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
      }
    });
    
    return filtered;
  }, [wishlistItems, searchQuery, priceRange, sortBy]);

  const handleAddAllToCart = async (items = filteredAndSortedItems) => {
    if (items.length === 0) return;
    
    setIsAddingAllToCart(true);
    let successCount = 0;
    
    try {
      for (const item of items) {
        try {
          await addToCart({
            _id: item.id,
            name: item.name,
            selling_price: item.price,
            image_url: [item.image]
          });
          successCount++;
        } catch (error) {
          console.warn(`Failed to add ${item.name} to cart:`, error);
        }
      }
      
      if (successCount > 0) {
        toast.success(`Added ${successCount} ${successCount === 1 ? 'item' : 'items'} to cart`);
      }
      
      if (successCount < items.length) {
        toast.warning(`${items.length - successCount} items could not be added`);
      }
    } catch (error) {
      toast.error('Failed to add items to cart');
    } finally {
      setIsAddingAllToCart(false);
    }
  };

  const handleAddSelectedToCart = async () => {
    const selectedItemsArray = filteredAndSortedItems.filter(item => 
      selectedItems.has(item._id || item.id)
    );
    await handleAddAllToCart(selectedItemsArray);
  };

  const handleRemoveSelected = async () => {
    if (selectedItems.size === 0) return;
    
    try {
      for (const itemId of selectedItems) {
        await removeFromWishlist(itemId);
      }
      setSelectedItems(new Set());
      toast.success(`Removed ${selectedItems.size} items from wishlist`);
    } catch (error) {
      toast.error('Failed to remove selected items');
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedItems.map(item => item._id || item.id)));
    }
  };

  const handleItemSelect = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleClearWishlist = async () => {
    try {
      await clearWishlist();
      toast.success('Wishlist cleared');
    } catch (error) {
      toast.error('Failed to clear wishlist');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner size="lg" text="Loading your wishlist..." className="min-h-64" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-red-100 to-pink-100 rounded-xl mr-4">
                <HeartSolidIcon className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
                <p className="text-gray-600 mt-1">
                  {filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'item' : 'items'} saved
                </p>
              </div>
            </div>
            
            {filteredAndSortedItems.length > 0 && (
              <div className="flex items-center space-x-3">
                {selectedItems.size > 0 && (
                  <>
                    <button 
                      onClick={handleAddSelectedToCart}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <ShoppingBagIcon className="h-4 w-4" />
                      <span>Add Selected to Cart ({selectedItems.size})</span>
                    </button>
                    
                    <button 
                      onClick={handleRemoveSelected}
                      className="text-red-600 hover:text-red-700 px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Remove Selected
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => handleAddAllToCart()}
                  disabled={isAddingAllToCart}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400 flex items-center space-x-2"
                >
                  <ShoppingBagIcon className="h-4 w-4" />
                  <span>{isAddingAllToCart ? 'Adding...' : 'Add All to Cart'}</span>
                </button>
                
                <button 
                  onClick={handleClearWishlist}
                  className="text-red-600 hover:text-red-700 px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
        {filteredAndSortedItems.length === 0 && wishlistItems.length === 0 ? (
          // Show different empty states based on authentication status
          !isAuthenticated ? (
            <UnauthenticatedEmptyState type="wishlist" />
          ) : (
            <EmptyState
              icon={HeartIcon}
              title="Your wishlist is empty"
              description="Save items you love for later. They'll appear here so you can easily find and purchase them."
              actionText="Start Shopping"
              actionLink="/products"
            />
          )
        ) : (
          <>
            {/* Filters and Controls */}
            {wishlistItems.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    {/* Search and Filters */}
                    <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
                      {/* Search */}
                      <div className="relative flex-1 max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search wishlist..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      {/* Price Range Filter */}
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          placeholder="Min price"
                          value={priceRange.min}
                          onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="number"
                          placeholder="Max price"
                          value={priceRange.max}
                          onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    {/* Sort and View Controls */}
                    <div className="flex items-center space-x-4">
                      {/* Sort Dropdown */}
                      <div className="relative">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="name">Name A-Z</option>
                          <option value="price-low">Price: Low to High</option>
                          <option value="price-high">Price: High to Low</option>
                        </select>
                        <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                      
                      {/* View Mode Toggle */}
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`p-2 rounded-md transition-colors ${
                            viewMode === 'grid'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <Squares2X2Icon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={`p-2 rounded-md transition-colors ${
                            viewMode === 'list'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <ListBulletIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bulk Selection */}
                  {filteredAndSortedItems.length > 0 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedItems.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            Select All ({filteredAndSortedItems.length})
                          </span>
                        </label>
                        
                        {selectedItems.size > 0 && (
                          <span className="text-sm text-blue-600 font-medium">
                            {selectedItems.size} selected
                          </span>
                        )}
                      </div>
                      
                      {(searchQuery || priceRange.min || priceRange.max) && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setPriceRange({ min: '', max: '' });
                          }}
                          className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                        >
                          <XMarkIcon className="h-4 w-4" />
                          <span>Clear Filters</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Results Info */}
            {filteredAndSortedItems.length === 0 && wishlistItems.length > 0 && (
              <div className="text-center py-12">
                <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your search or filter criteria</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setPriceRange({ min: '', max: '' });
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
            
            {/* Wishlist Items */}
            {filteredAndSortedItems.length > 0 && (
              <div className={`${
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'
                  : 'space-y-4'
              }`}>
                {filteredAndSortedItems.map((item) => (
                  <WishlistItem
                    key={item.wishlistItemId || item._id || item.id}
                    item={item}
                    onRemove={removeFromWishlist}
                    loading={loading}
                    viewMode={viewMode}
                    isSelected={selectedItems.has(item._id || item.id)}
                    onSelect={() => handleItemSelect(item._id || item.id)}
                  />
                ))}
              </div>
            )}
            
            {/* Recommended Products Section */}
            {filteredAndSortedItems.length > 0 && (
              <div className="mt-16 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">You might also like</h2>
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-4">Recommended products based on your wishlist will appear here</p>
                  <Link 
                    to="/products" 
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Browse all products
                    <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
