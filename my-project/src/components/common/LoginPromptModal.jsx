import React from 'react';
import { Link } from 'react-router-dom';
import { XMarkIcon, ShoppingCartIcon, HeartIcon, UserIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const LoginPromptModal = ({ 
  isOpen, 
  onClose, 
  title = "Sign in to continue", 
  message = "Please sign in to access this feature",
  feature = "cart", // "cart" or "wishlist"
  showBenefits = true 
}) => {
  if (!isOpen) return null;

  const featureIcon = feature === 'cart' ? ShoppingCartIcon : HeartIcon;
  const FeatureIcon = featureIcon;

  const benefits = [
    {
      icon: ShoppingCartIcon,
      title: "Save your items",
      description: "Your cart and wishlist sync across all devices"
    },
    {
      icon: ShieldCheckIcon,
      title: "Secure checkout",
      description: "Protected payment and order tracking"
    },
    {
      icon: UserIcon,
      title: "Personalized experience",
      description: "Get recommendations and exclusive offers"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
              <FeatureIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {message}
                </p>
              </div>
            </div>
          </div>

          {showBenefits && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Why sign in?</h4>
              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start">
                    <benefit.icon className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{benefit.title}</p>
                      <p className="text-xs text-gray-500">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 sm:flex sm:flex-row-reverse gap-3">
            <Link
              to="/login"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
              onClick={onClose}
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
              onClick={onClose}
            >
              Create Account
            </Link>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
              onClick={onClose}
            >
              Continue Browsing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPromptModal;
