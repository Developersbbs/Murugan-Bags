import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, User, CheckCircle, Loader2, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import ratingService from '../../services/ratingService';
import uploadService from '../../services/uploadService';
import orderService from '../../services/orderService';

const RatingReview = ({ productId }) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState({ averageRating: 0, totalRatings: 0, distribution: [] });
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});

  // Review form states
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Fetch ratings
  const fetchRatings = async (page = 1, sort = sortOption) => {
    try {
      setLoading(true);
      const data = await ratingService.getProductReviews(productId, page);

      if (data.success) {
        setRatings(page === 1 ? data.data : [...ratings, ...data.data]);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [productId]);

  // Handle sort change
  const handleSortChange = (newSort) => {
    setSortOption(newSort);
    setCurrentPage(1);
    setRatings([]);
    fetchRatings(1, newSort);
  };

  // Image handling
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedImages.length > 5) {
      alert('You can upload a maximum of 5 images');
      return;
    }

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setSelectedImages([...selectedImages, ...newImages]);
  };

  const removeImage = (index) => {
    const newImages = [...selectedImages];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setSelectedImages(newImages);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Please select a star rating');
      return;
    }

    try {
      setUploading(true);

      // 1. Check eligibility (find order)
      const orders = await orderService.getMyOrders(user.uid || user.id);
      const eligibleOrder = orders.find(order =>
        order.status === 'delivered' &&
        order.items.some(item => {
          const itemProdId = typeof item.product_id === 'object' ? item.product_id._id : item.product_id;
          return itemProdId === productId;
        })
      );

      if (!eligibleOrder) {
        alert('You can only review products from delivered orders.');
        setUploading(false);
        return;
      }

      // 2. Upload images
      const imageUrls = [];
      for (const img of selectedImages) {
        const url = await uploadService.uploadFile(img.file, 'reviews');
        imageUrls.push(url);
      }

      // 3. Submit review
      const reviewData = {
        product_id: productId,
        order_id: eligibleOrder._id || eligibleOrder.id,
        rating,
        review: reviewText,
        images: imageUrls
      };

      await ratingService.submitReview(reviewData);

      // Reset form
      setReviewText('');
      setRating(0);
      setSelectedImages([]);
      setShowReviewForm(false);
      fetchRatings(1, sortOption); // Refresh list
      alert('Review submitted successfully!');

    } catch (error) {
      console.error('Submit error:', error);
      alert(error.message || 'Failed to submit review');
    } finally {
      setUploading(false);
    }
  };

  // Render star rating
  const renderStars = (rating, interactive = false, onChange = null) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={interactive ? 24 : 16}
            className={`
              ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
              ${interactive ? 'cursor-pointer hover:text-yellow-400 transition-colors' : ''}
            `}
            onClick={() => interactive && onChange && onChange(star)}
          />
        ))}
      </div>
    );
  };

  // Load more ratings
  const loadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchRatings(nextPage, sortOption);
  };

  if (loading && ratings.length === 0) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Average Rating */}
          <div className="text-center md:border-r border-gray-200 md:pr-6">
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {stats?.averageRating?.toFixed(1) || '0.0'}
            </div>
            <div className="flex justify-center mb-2">
              {renderStars(Math.round(stats.averageRating))}
            </div>
            <div className="text-sm text-gray-600">
              {stats.totalRatings} {stats.totalRatings === 1 ? 'rating' : 'ratings'}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.distribution.find(d => d.rating === rating)?.count || 0;
              const percentage = stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0;

              return (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-8">{rating}</span>
                  <Star size={16} className="text-yellow-400 fill-yellow-400" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Write Review Section */}
      {isAuthenticated && !showReviewForm && (
        <button
          onClick={() => setShowReviewForm(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition font-medium"
        >
          Write a Review
        </button>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <div className="bg-white border rounded-lg p-6 shadow-sm animate-in fade-in slide-in-from-top-2">
          <h3 className="text-lg font-semibold mb-4">Write your review</h3>
          <form onSubmit={handleSubmitReview}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={28}
                    className={`cursor-pointer transition-colors ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Review</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
                className="w-full border rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="What did you like or dislike? (Optional)"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Add Photos (Max 5)</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer relative">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload files</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" multiple onChange={handleImageSelect} />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {selectedImages.length > 0 && (
                <div className="flex gap-4 mt-4 overflow-x-auto pb-2">
                  {selectedImages.map((img, idx) => (
                    <div key={idx} className="relative flex-shrink-0 group">
                      <img
                        src={img.preview}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-md border shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={uploading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading && <Loader2 size={16} className="animate-spin" />}
                {uploading ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-200 border border-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sort Options */}
      {ratings.length > 0 && (
        <div className="flex items-center justify-between border-b pb-4">
          <h3 className="text-lg font-semibold text-gray-900">Customer Reviews</h3>
          <select
            value={sortOption}
            onChange={(e) => handleSortChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
          </select>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {ratings.map((rating) => (
          <div key={rating._id} className="border-b pb-6 last:border-0">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                {rating.customer_id?.image_url ? (
                  <img src={rating.customer_id.image_url} alt={rating.customer_id.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <User size={20} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 truncate">
                    {rating.customer_id?.name || 'Anonymous Customer'}
                  </span>
                  {rating.verified_purchase && (
                    <span className="flex items-center gap-0.5 text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100">
                      <CheckCircle size={10} className="fill-green-600 text-white" />
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {renderStars(rating.rating)}
                  <span className="text-xs text-gray-500">
                    {new Date(rating.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>

                {rating.review && (
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">{rating.review}</p>
                )}

                {/* Review Images */}
                {rating.images && rating.images.length > 0 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto">
                    {rating.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Review ${idx}`}
                        className="h-20 w-20 object-cover rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(img, '_blank')}
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
                    <ThumbsUp size={14} />
                    Helpful ({rating.helpful_count || 0})
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {pagination.hasNextPage && (
        <div className="text-center pt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            {loading ? 'Loading...' : 'Load More Reviews'}
          </button>
        </div>
      )}

      {/* No Reviews */}
      {!loading && ratings.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <Star size={48} strokeWidth={1} />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No reviews yet</h3>
          <p className="mt-1 text-sm text-gray-500">Be the first to share your thoughts on this product!</p>
          {isAuthenticated && (
            <div className="mt-6">
              <button
                onClick={() => setShowReviewForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Write a Review
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RatingReview;