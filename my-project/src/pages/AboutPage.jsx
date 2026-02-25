import React from 'react';
import { Helmet } from 'react-helmet-async';
import { FaGraduationCap, FaBoxOpen, FaHandshake, FaGlobe } from 'react-icons/fa';

const AboutPage = () => {
    return (
        <div className="bg-white">
            <Helmet>
                <title>About Us - Murugan Bags</title>
                <meta name="description" content="Learn more about Murugan Bags, our mission, and our values." />
            </Helmet>

            {/* Hero Section */}
            <section className="relative py-20 bg-gray-900 text-white overflow-hidden">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-purple-900 mix-blend-multiply"></div>
                    {/* You could add a background image here */}
                </div>
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">Our Story</h1>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        Crafting excellence in every stitch. Murugan Bags has been a leader in the bag manufacturing industry,
                        providing high-quality, durable, and stylish solutions for all your carrying needs.
                    </p>
                </div>
            </section>

            {/* Mission & Vision */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
                            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                                At Murugan Bags, our mission is to empower individuals by providing them with the perfect carrying companion.
                                Whether it's for school, work, travel, or everyday life, we strive to create products that combine
                                functionality with modern aesthetics, ensuring that you can carry your world with confidence and style.
                            </p>
                            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Vision</h2>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                We envision becoming a global leader in the bag industry, recognized for our innovation, quality, and commitment to sustainability.
                                Our goal is to continuously push the boundaries of design and manufacturing to bring you the best-in-class luggage solutions.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                                <FaBoxOpen className="text-4xl text-blue-600 mb-4" />
                                <h3 className="font-bold text-gray-900">Quality Products</h3>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                                <FaGraduationCap className="text-4xl text-purple-600 mb-4" />
                                <h3 className="font-bold text-gray-900">Expert Craftsmanship</h3>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                                <FaHandshake className="text-4xl text-rose-600 mb-4" />
                                <h3 className="font-bold text-gray-900">Customer Trust</h3>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                                <FaGlobe className="text-4xl text-green-600 mb-4" />
                                <h3 className="font-bold text-gray-900">Sustainable Focus</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-4xl font-bold text-gray-900 mb-12">Our Core Values</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="p-8">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-2xl font-bold">1</span>
                            </div>
                            <h3 className="text-xl font-bold mb-4">Integrity</h3>
                            <p className="text-gray-600">We believe in being honest, transparent, and ethical in everything we do.</p>
                        </div>
                        <div className="p-8">
                            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-2xl font-bold">2</span>
                            </div>
                            <h3 className="text-xl font-bold mb-4">Innovation</h3>
                            <p className="text-gray-600">We are constantly seeking new ways to improve our products and processes.</p>
                        </div>
                        <div className="p-8">
                            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-2xl font-bold">3</span>
                            </div>
                            <h3 className="text-xl font-bold mb-4">Quality</h3>
                            <p className="text-gray-600">We never compromise on the quality of materials or workmanship.</p>
                        </div>
                        <div className="p-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-2xl font-bold">4</span>
                            </div>
                            <h3 className="text-xl font-bold mb-4">Community</h3>
                            <p className="text-gray-600">We are dedicated to making a positive impact on the communities we serve.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Team Section Placeholder / Call to Action */}
            <section className="py-20 bg-gray-900 text-white text-center">
                <div className="container mx-auto px-4">
                    <h2 className="text-4xl font-bold mb-8">Join Our Journey</h2>
                    <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                        Discover our wide range of products and experience the Murugan Bags difference today.
                    </p>
                    <a href="/products" className="inline-block px-10 py-4 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-100 transition-colors shadow-xl transform hover:scale-105 duration-200">
                        Explore Collection
                    </a>
                </div>
            </section>
        </div>
    );
};

export default AboutPage;
