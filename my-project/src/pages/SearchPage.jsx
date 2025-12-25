import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaSearch, FaHistory, FaArrowRight, FaTimes, FaFire, FaRegCircle } from 'react-icons/fa';
import { useGetSearchSuggestionsQuery } from '../redux/services/products';
import { motion, AnimatePresence } from 'framer-motion';

const SearchPage = () => {
    const [query, setQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState([]);
    const navigate = useNavigate();
    const inputRef = useRef(null);

    const { data: suggestionsData, isLoading } = useGetSearchSuggestionsQuery(query, {
        skip: query.length < 2
    });

    const popularCategories = [
        { name: 'BackPacks', slug: 'BackPacks' },
        { name: 'Trolley Bags', slug: 'Trolley Bags' },
        { name: 'School Bags', slug: 'School Bags' },
        { name: 'Laptop Bags', slug: 'Laptop Bags' },
        { name: 'Office Bags', slug: 'Office Bags' }
    ];

    useEffect(() => {
        const saved = localStorage.getItem('recent_searches');
        if (saved) {
            setRecentSearches(JSON.parse(saved));
        }
        inputRef.current?.focus();
    }, []);

    const handleSearch = (searchTerm) => {
        if (!searchTerm.trim()) return;

        // Save to recent searches
        const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('recent_searches', JSON.stringify(updated));

        navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
    };

    const removeRecent = (e, term) => {
        e.stopPropagation();
        const updated = recentSearches.filter(s => s !== term);
        setRecentSearches(updated);
        localStorage.setItem('recent_searches', JSON.stringify(updated));
    };

    const clearAllRecent = () => {
        setRecentSearches([]);
        localStorage.removeItem('recent_searches');
    };

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-12">
            <div className="container mx-auto px-4 max-w-4xl">
                {/* Search Header */}
                <div className="mb-12 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold text-slate-900 mb-4"
                    >
                        Find what you're looking for
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-500"
                    >
                        Search across thousands of products and categories
                    </motion.p>
                </div>

                {/* Search Input Box */}
                <div className="relative mb-12">
                    <div className="relative group">
                        <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors text-xl" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search backpacks, trolley bags, etc..."
                            className="w-full pl-16 pr-24 py-6 bg-white border-2 border-transparent shadow-xl rounded-3xl text-xl focus:outline-none focus:border-rose-500/30 focus:ring-4 focus:ring-rose-500/10 transition-all placeholder:text-slate-300 text-slate-800"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                        />
                        <button
                            onClick={() => handleSearch(query)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-rose-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-500/30 active:scale-95"
                        >
                            Search
                        </button>
                    </div>

                    {/* Real-time Suggestions Dropdown */}
                    <AnimatePresence>
                        {query.length >= 2 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 right-0 mt-4 bg-white rounded-3xl shadow-2xl overflow-hidden z-50 border border-slate-100"
                            >
                                {isLoading ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <div className="animate-spin inline-block w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full mb-2"></div>
                                        <p>Fetching suggestions...</p>
                                    </div>
                                ) : suggestionsData?.data?.length > 0 ? (
                                    <div className="py-4">
                                        {suggestionsData.data.map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => item.type === 'product' ? navigate(`/product/${item.slug}`) : navigate(`/products?category=${item.slug}`)}
                                                className="w-full flex items-center px-6 py-4 hover:bg-slate-50 transition-colors group text-left"
                                            >
                                                {item.type === 'product' ? (
                                                    <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden mr-4 flex-shrink-0">
                                                        {item.image ? (
                                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center"><FaRegCircle className="text-slate-300" /></div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                                                        <FaFire className="text-rose-500" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-800 truncate group-hover:text-rose-600 transition-colors">
                                                        {item.name}
                                                    </p>
                                                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                                                        {item.type} {item.price && `• ₹${item.price}`}
                                                    </p>
                                                </div>
                                                <FaArrowRight className="text-slate-300 group-hover:text-rose-500 transition-all transform group-hover:translate-x-1" />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-slate-400">
                                        <p>No matches found for "{query}"</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Recent Searches */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                                <FaHistory className="mr-2 text-slate-400" />
                                Recent Searches
                            </h2>
                            {recentSearches.length > 0 && (
                                <button
                                    onClick={clearAllRecent}
                                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 uppercase tracking-wider"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>

                        {recentSearches.length > 0 ? (
                            <div className="space-y-2">
                                {recentSearches.map((term, i) => (
                                    <div
                                        key={i}
                                        onClick={() => handleSearch(term)}
                                        className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-rose-200 hover:shadow-md transition-all cursor-pointer group"
                                    >
                                        <span className="text-slate-600 group-hover:text-slate-900 font-medium">{term}</span>
                                        <button
                                            onClick={(e) => removeRecent(e, term)}
                                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center">
                                <p className="text-slate-400 italic">No recent searches yet</p>
                            </div>
                        )}
                    </section>

                    {/* Popular Categories */}
                    <section>
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                            <FaFire className="mr-2 text-rose-500" />
                            Popular Categories
                        </h2>
                        <div className="grid grid-cols-1 gap-2">
                            {popularCategories.map((cat, i) => (
                                <Link
                                    key={i}
                                    to={`/products?category=${cat.slug}`}
                                    className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-rose-200 hover:shadow-md transition-all group"
                                >
                                    <span className="text-slate-600 group-hover:text-slate-900 font-medium">{cat.name}</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-rose-50 transition-colors">
                                        <FaArrowRight className="text-slate-300 group-hover:text-rose-500 text-sm transition-colors" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default SearchPage;
