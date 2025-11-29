import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon, HeartIcon, UserPlusIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import LoginPromptModal from './LoginPromptModal';

const UnauthenticatedEmptyState = ({ 
  type = 'cart', // 'cart' or 'wishlist'
  className = '' 
}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);

  const isCart = type === 'cart';
  const Icon = isCart ? ShoppingCartIcon : HeartIcon;
  
  const content = {
    cart: {
      title: 'Your cart awaits!',
      subtitle: 'Sign in to save items and checkout securely',
      description: 'Create an account or sign in to start adding items to your cart. Your items will be saved across all your devices.',
      benefits: [
        'Save items across devices',
        'Faster checkout process',
        'Order history and tracking',
        'Exclusive member discounts'
      ]
    },
    wishlist: {
      title: 'Save items you love!',
      subtitle: 'Sign in to create your personal wishlist',
      description: 'Create an account or sign in to save your favorite items. Never lose track of products you want to buy later.',
      benefits: [
        'Save unlimited items',
        'Get price drop alerts',
        'Share with friends',
        'Quick add to cart'
      ]
    }
  };

  const currentContent = content[type];

  return (
    <>
      <div className={`text-center py-16 px-4 ${className}`}>
        <div className="max-w-md mx-auto">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 mb-6">
            <Icon className="h-10 w-10 text-blue-600" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentContent.title}
          </h2>
          
          {/* Subtitle */}
          <p className="text-lg text-gray-600 mb-4">
            {currentContent.subtitle}
          </p>
          
          {/* Description */}
          <p className="text-gray-500 mb-8">
            {currentContent.description}
          </p>

          {/* Benefits */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Member Benefits
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {currentContent.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center">
                  <div className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-3"></div>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => setShowLoginModal(true)}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center group"
            >
              Sign In to Continue
              <ArrowRightIcon className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="text-sm text-gray-500">or</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>
            
            <Link
              to="/products"
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors inline-flex items-center justify-center"
            >
              Continue Shopping
            </Link>
          </div>

          {/* Quick Links */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-3">New to our store?</p>
            <Link
              to="/register"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Create a free account →
            </Link>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title={`Sign in to access your ${type}`}
        message={`Please sign in to save items to your ${type} and access them from any device.`}
        feature={type}
        showBenefits={true}
      />
    </>
  );
};

export default UnauthenticatedEmptyState;
