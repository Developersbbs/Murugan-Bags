import React from 'react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <div id="hero" className="relative bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Decorative image and overlay */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80"
          alt=""
          className="w-full h-full object-cover object-center opacity-20"
        />
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-purple-900/80" />

      <div className="relative max-w-4xl mx-auto py-32 px-6 flex flex-col items-center text-center sm:py-64 lg:px-0">
        <div className="mb-8">
          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/10 text-white backdrop-blur-sm border border-white/20">
            ✨ New Collection Available
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
          <span className="block">Welcome to</span>
          <span className="block bg-gradient-to-r from-yellow-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            Murugan Bags
          </span>
        </h1>

        <p className="mt-6 text-xl md:text-2xl text-gray-200 max-w-3xl leading-relaxed">
          Discover amazing products at unbeatable prices. Shop the latest trends in fashion,
          electronics, home goods, and more with <span className="text-yellow-400 font-semibold">free shipping</span> on orders over $50.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            to="/products"
            className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <svg className="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Shop Now
          </Link>

          <Link
            to="/about"
            className="inline-flex items-center px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl backdrop-blur-sm border border-white/20 transition-all duration-200 hover:scale-105"
          >
            Learn More
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
            </svg>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-white">10K+</div>
            <div className="text-gray-300">Happy Customers</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">500+</div>
            <div className="text-gray-300">Products</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">24/7</div>
            <div className="text-gray-300">Support</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
