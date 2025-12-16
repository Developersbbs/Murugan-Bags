import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, User, CheckCircle, Loader2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import ratingService from '../../services/ratingService';


const RatingReview = ({ productId }) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState({ averageRating: 0, totalRatings: 0, distribution: [] });
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});

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
    fetchRatings();
  }, [productId]);

  // Handle sort change
  const handleSortChange = (newSort) => {
    setSortOption(newSort);
    setCurrentPage(1);
    setRatings([]);
    fetchRatings(1, newSort);
  };

  // Handle rating submission


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
          <div className="text-center">
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

      {/* Write Review Button */}


      {/* Sort Options */}
      {ratings.length > 0 && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Customer Reviews</h3>
          <select
            value={sortOption}
            onChange={(e) => handleSortChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
          </select>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {ratings.map((rating) => (
          <div key={rating._id} className="border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User size={20} className="text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">
                    {rating.customer_id?.name || 'Anonymous Customer'}
                  </span>
                  {rating.verified_purchase && (
                    <CheckCircle size={16} className="text-green-600" />
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(rating.rating)}
                  <span className="text-sm text-gray-500">
                    {new Date(rating.created_at).toLocaleDateString()}
                  </span>
                </div>
                {rating.review && (
                  <p className="text-gray-700">{rating.review}</p>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                    <ThumbsUp size={16} />
                    Helpful
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {pagination.hasNextPage && (
        <div className="text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Load More Reviews'}
          </button>
        </div>
      )}

      {/* No Reviews */}
      {!loading && ratings.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500">No reviews yet. Be the first to review this product!</div>
        </div>
      )}
    </div>
  );
};

export default RatingReview;