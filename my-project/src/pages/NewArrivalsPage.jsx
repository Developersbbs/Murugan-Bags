import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ProductCard from '../components/product/ProductCard';
import Loading from '../components/common/Loading';
import Skeleton from '../components/common/Skeleton';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config/api';

const NewArrivalsPage = () => {
    const [banners, setBanners] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bannerLoading, setBannerLoading] = useState(true);

    useEffect(() => {
        fetchBanners();
        fetchNewArrivals();
    }, []);

    const fetchBanners = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/new-arrival-banners`);
            const data = await res.json();
            if (data.success) {
                setBanners(data.data);
            }
        } catch (error) {
            console.error('Error fetching new arrival banners:', error);
        } finally {
            setBannerLoading(false);
        }
    };

    const fetchNewArrivals = async () => {
        try {
            // Fetch products with isNewArrival=true
            const res = await fetch(`${API_BASE_URL}/products?isNewArrival=true&limit=20`);
            const data = await res.json();
            if (data.products) {
                setProducts(data.products);
            }
        } catch (error) {
            console.error('Error fetching new arrival products:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFullImageUrl = (imagePath) => {
        if (!imagePath) return '';
        if (imagePath.startsWith('http')) return imagePath;
        const baseUrl = API_BASE_URL.replace('/api', '');
        return `${baseUrl}${imagePath}`;
    };

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-12">
            <div className="container mx-auto px-4">
                {/* Banners Section */}
                {!bannerLoading && banners.length > 0 && (
                    <div className="mb-12 space-y-8">
                        {banners.map((banner, index) => (
                            <motion.div
                                key={banner._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative h-[400px] rounded-3xl overflow-hidden shadow-2xl group"
                            >
                                <img
                                    src={getFullImageUrl(banner.image)}
                                    alt={banner.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient}`}></div>
                                <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 text-white max-w-2xl">
                                    <motion.span
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-rose-400 font-bold tracking-widest uppercase mb-2 block"
                                    >
                                        {banner.subtitle || 'New Arrival'}
                                    </motion.span>
                                    <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
                                        {banner.title}
                                    </h1>
                                    <p className="text-lg text-white/80 mb-8 line-clamp-2">
                                        {banner.description}
                                    </p>
                                    <Link
                                        to={(!banner.ctaLink || banner.ctaLink === '/new-arrivals') ? '/products' : banner.ctaLink}
                                        className="inline-flex items-center justify-center bg-white text-rose-600 font-bold px-8 py-4 rounded-full hover:bg-rose-50 transition-all transform hover:-translate-y-1 w-fit"
                                    >
                                        {banner.ctaText || 'Shop Now'}
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Products Grid */}
                <div className="mb-8">
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Latest Arrivals</h2>
                    <p className="text-slate-500 mb-8 font-medium">Discover our newest collection of premium bags</p>

                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                    <Skeleton className="h-64 w-full rounded-xl mb-4" />
                                    <Skeleton className="h-4 w-3/4 mb-2" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : products.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {products.map((product, index) => (
                                <motion.div
                                    key={product._id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <ProductCard product={product} />
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                            <div className="text-slate-300 mb-4 flex justify-center">
                                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No new arrivals found</h3>
                            <p className="text-slate-500 max-w-sm mx-auto">Check back soon for our latest products and collections.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewArrivalsPage;
