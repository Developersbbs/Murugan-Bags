import React, { useState } from 'react';
import { LoadingSpinner, LoadingScreen, LoadingButton, LoadingCard } from '../components/common/Loading';

const LoadingDemoPage = () => {
  const [loading, setLoading] = useState(false);
  const [currentVariant, setCurrentVariant] = useState('ring');

  const variants = ['default', 'pulse', 'bounce', 'wave', 'ring', 'dots', 'shimmer'];

  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
          Loading Animations Demo
        </h1>

        {/* Loading Spinners */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Loading Spinners</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {variants.map((variant) => (
              <div key={variant} className="bg-white rounded-lg shadow-md p-6 text-center">
                <h3 className="text-lg font-medium text-gray-700 mb-4 capitalize">{variant}</h3>
                <LoadingSpinner variant={variant} size="large" />
              </div>
            ))}
          </div>
        </section>

        {/* Loading Screens */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Loading Screens</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {variants.slice(0, 4).map((variant) => (
              <div key={`screen-${variant}`} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-64 relative">
                  <LoadingScreen
                    variant={variant}
                    message={`Loading with ${variant} animation`}
                    fullScreen={false}
                    className="absolute inset-0"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-medium text-gray-700 capitalize">{variant} Screen</h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Loading Buttons */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Loading Buttons</h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-wrap gap-4 mb-6">
              {variants.map((variant) => (
                <button
                  key={variant}
                  onClick={() => setCurrentVariant(variant)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentVariant === variant
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {variant}
                </button>
              ))}
            </div>
            <div className="flex justify-center">
              <LoadingButton
                loading={loading}
                variant={currentVariant}
                onClick={simulateLoading}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
              >
                Click to Load
              </LoadingButton>
            </div>
          </div>
        </section>

        {/* Loading Cards */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Loading Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <LoadingCard key={i} />
            ))}
          </div>
        </section>

        {/* Interactive Demo */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Interactive Demo</h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-700 mb-4">
                Try different loading variants
              </h3>
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                {variants.map((variant) => (
                  <button
                    key={variant}
                    onClick={() => setCurrentVariant(variant)}
                    className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                      currentVariant === variant
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transform scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {variant}
                  </button>
                ))}
              </div>
              <div className="inline-block">
                <LoadingButton
                  loading={loading}
                  variant={currentVariant}
                  size="large"
                  onClick={simulateLoading}
                  className="px-12 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Start Loading Demo
                </LoadingButton>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoadingDemoPage;
