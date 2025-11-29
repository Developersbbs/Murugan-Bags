import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <main>
          {/* Animated 404 */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6 animate-bounce">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              404
            </h1>
          </div>
          
          {/* Content */}
          <div className="mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Oops! Page Not Found
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-2">
              The page you're looking for seems to have wandered off into the digital wilderness.
            </p>
            <p className="text-lg text-gray-500">
              Don't worry, even the best explorers sometimes take a wrong turn!
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link
              to="/"
              className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <svg className="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go Back Home
            </Link>
            
            <Link
              to="/products"
              className="inline-flex items-center px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Browse Products
            </Link>
            
            <Link
              to="/contact"
              className="inline-flex items-center px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-purple-300 transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 11-9.75 9.75 9.75 9.75 0 019.75-9.75z" />
              </svg>
              Get Help
            </Link>
          </div>
          
          {/* Fun Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">🏠</div>
              <div className="text-lg font-semibold text-gray-900">Home Sweet Home</div>
              <div className="text-sm text-gray-600">Your starting point</div>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
              <div className="text-3xl font-bold text-purple-600 mb-2">🛍️</div>
              <div className="text-lg font-semibold text-gray-900">Amazing Products</div>
              <div className="text-sm text-gray-600">Waiting for you</div>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
              <div className="text-3xl font-bold text-green-600 mb-2">💬</div>
              <div className="text-lg font-semibold text-gray-900">24/7 Support</div>
              <div className="text-sm text-gray-600">We're here to help</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default NotFoundPage;
