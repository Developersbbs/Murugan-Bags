import React from 'react';
import { Link } from 'react-router-dom';

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actionText, 
  actionLink, 
  onAction,
  className = '' 
}) => {
  return (
    <div className={`text-center py-16 px-6 ${className}`}>
      <div className="max-w-md mx-auto">
        {Icon && (
          <div className="mx-auto h-32 w-32 mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full animate-pulse"></div>
            <div className="relative h-full w-full flex items-center justify-center">
              <Icon className="h-16 w-16 text-gray-400" />
            </div>
          </div>
        )}
        
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          {title}
        </h3>
        
        {description && (
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            {description}
          </p>
        )}
        
        {(actionText && (actionLink || onAction)) && (
          <div className="space-y-4">
            {actionLink ? (
              <Link 
                to={actionLink}
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <svg className="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {actionText}
              </Link>
            ) : (
              <button 
                onClick={onAction}
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <svg className="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {actionText}
              </button>
            )}
            
            <div className="text-sm text-gray-500 mt-4">
              <p>Need help? <Link to="/contact" className="text-blue-600 hover:text-blue-700 font-medium underline">Contact our support team</Link></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
