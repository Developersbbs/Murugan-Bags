import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

const CACHE_KEY = 'sbbs_home_data';
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

const FALLBACK_DATA = {
    heroSlides: [],
    categories: [],
    newArrivals: [],
    colors: [],
    features: [],
    comboOffers: [],
    marqueeOffers: []
};

// Helper to fix image URLs
const fixImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `http://localhost:5000${url}`;
    return url;
};

export const useHomeData = () => {
    const [data, setData] = useState(FALLBACK_DATA);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Check Cache
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    try {
                        const { timestamp, data: cachedData } = JSON.parse(cached);
                        if (Date.now() - timestamp < CACHE_DURATION) {
                            console.log('Using cached home data');
                            setData(cachedData);
                            setLoading(false);
                            // Optional: background refresh could be implemented here
                            // For now, return early to save bandwidth
                            return;
                        } else {
                            console.log('Home cache expired');
                        }
                    } catch (e) {
                        console.warn('Cache parse error', e);
                        localStorage.removeItem(CACHE_KEY);
                    }
                }

                console.log('Fetching fresh home data...');
                // 2. Fetch Parallel
                const API_URL = API_BASE_URL;

                const [
                    heroRes,
                    catRes,
                    newArrRes,
                    colorsRes,
                    offersRes,
                    comboRes,
                    marqueeRes
                ] = await Promise.allSettled([
                    fetch(`${API_URL}/hero-section`),
                    fetch(`${API_URL}/categories`),
                    fetch(`${API_URL}/products?page=1&limit=4&isNewArrival=true&published=true`),
                    fetch(`${API_URL}/products/colors`),
                    fetch(`${API_URL}/special-offers`),
                    fetch(`${API_URL}/combo-offers?isHomeFeatured=true&limit=2`),
                    fetch(`${API_URL}/marquee-offers`)
                ]);

                // Helper to safely get data
                const getVal = async (res) => {
                    if (res.status === 'fulfilled' && res.value.ok) {
                        try {
                            const json = await res.value.json();
                            return json.success ? json.data : [];
                        } catch (e) { return []; }
                    }
                    return [];
                };

                const heroSlides = await getVal(heroRes);
                const categories = await getVal(catRes);
                const newArrivals = await getVal(newArrRes);
                const colors = await getVal(colorsRes);
                const features = await getVal(offersRes);
                const comboOffers = await getVal(comboRes);
                const marqueeOffers = await getVal(marqueeRes);

                // Process Data (Mirroring logic from HomePage.jsx)

                // Process Hero
                const processedHero = heroSlides.map(slide => ({
                    ...slide,
                    image: fixImageUrl(slide.image)
                }));

                // Process Categories
                const processedCategories = categories.map(cat => ({
                    name: cat.name,
                    image: fixImageUrl(cat.image_url || cat.image),
                    link: `/products?category=${cat.slug || cat.name}`,
                    description: cat.description || "Shop Now"
                }));

                // Process New Arrivals
                let processedNewArrivals = newArrivals.map(product => {
                    let imageUrl = product.image_url?.[0] || product.images?.[0];
                    if (!imageUrl && product.product_variants?.length > 0) {
                        const v = product.product_variants[0];
                        imageUrl = v.images?.[0] || v.image_url?.[0] || v.image;
                    }

                    let price = product.selling_price || product.price;
                    let originalPrice = product.cost_price;

                    if ((!price || price === 0) && product.product_variants?.length > 0) {
                        const v = product.product_variants[0];
                        price = v.selling_price || v.price || v.salesPrice;
                        originalPrice = v.cost_price || v.original_price || v.costPrice;
                    }

                    return {
                        id: product._id,
                        name: product.name,
                        price,
                        originalPrice,
                        image: fixImageUrl(imageUrl),
                        badge: "NEW",
                        rating: product.rating || 4.5
                    };
                });

                // 3. Update State
                const newData = {
                    heroSlides: processedHero.length ? processedHero : FALLBACK_DATA.heroSlides,
                    categories: processedCategories.length ? processedCategories : FALLBACK_DATA.categories,
                    newArrivals: processedNewArrivals,
                    colors: colors || [],
                    features: features || [],
                    comboOffers: comboOffers || [],
                    marqueeOffers: marqueeOffers || []
                };

                setData(newData);
                setLoading(false);

                // 4. Update Cache
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    data: newData
                }));

            } catch (err) {
                console.error('Home data fetch error:', err);
                setError(err);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { ...data, loading, error };
};
