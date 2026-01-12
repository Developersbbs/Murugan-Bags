import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaShoppingBag, FaSuitcaseRolling, FaLaptop, FaTruck, FaShieldAlt, FaCreditCard, FaHeadset, FaArrowRight, FaChevronLeft, FaChevronRight, FaStar } from 'react-icons/fa';
import OfferPopup from '../components/OfferPopup';
import { API_BASE_URL } from '../config/api';
import { useHomeData } from '../hooks/useHomeData';

const HomePage = () => {
  // Use the new hook for consolidated data fetching and caching
  const {
    heroSlides,
    categories,
    newArrivals,
    colors,
    features,
    comboOffers,
    marqueeOffers,
    loading: loadingData
  } = useHomeData();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [scrollY, setScrollY] = useState(0);
  const [colorProducts, setColorProducts] = useState([]);
  const [loadingColorProducts, setLoadingColorProducts] = useState(false);

  // Handle scroll for parallax
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Auto-slide effect
  useEffect(() => {
    if (heroSlides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  // Fetch color specific products on interaction
  useEffect(() => {
    if (!selectedColor) return;

    const fetchColorProducts = async () => {
      setLoadingColorProducts(true);
      try {
        const API_URL = API_BASE_URL;
        const res = await fetch(`${API_URL}/products?color=${encodeURIComponent(selectedColor)}&limit=4`);
        const data = await res.json();

        if (data.success && data.data) {
          const mappedProducts = data.data.map(product => {
            let imageUrl = product.image_url?.[0] || product.images?.[0];

            // Fallback to variant image
            if (product.product_variants && product.product_variants.length > 0) {
              const matchingVariant = product.product_variants.find(v => {
                // simplified check
                const attrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : v.attributes;
                return attrs && attrs.Color && attrs.Color.toLowerCase() === selectedColor.toLowerCase();
              });
              const v = matchingVariant || product.product_variants[0];
              if (v) {
                imageUrl = v.images?.[0] || v.image_url?.[0] || v.image || imageUrl;
              }
            }

            if (imageUrl && imageUrl.startsWith('/')) {
              imageUrl = `http://localhost:5000${imageUrl}`;
            }

            return {
              id: product._id,
              name: product.name,
              price: product.selling_price || product.price,
              originalPrice: product.cost_price,
              image: imageUrl || "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=400&h=400&fit=crop",
              rating: product.rating || 4.5
            };
          });
          setColorProducts(mappedProducts);
        }
      } catch (error) {
        console.error('Error fetching color products:', error);
        setColorProducts([]);
      } finally {
        setLoadingColorProducts(false);
      }
    };

    fetchColorProducts();
  }, [selectedColor]);

  // Loading Skeleton
  if (loadingData && heroSlides.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading amazing collections...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden font-sans -mt-20">
      <OfferPopup />

      {/* Hero Section */}
      <section className="relative h-screen min-h-[600px] overflow-hidden bg-slate-900">
        {heroSlides.map((slide, index) => (
          <div
            key={`hero-slide-${index}`}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            <div
              className="absolute inset-0 transition-transform duration-[2000ms] ease-out"
              style={{
                transform: index === currentSlide ? `scale(1.05) translateY(${scrollY * 0.5}px)` : 'scale(1.0) translateY(0)'
              }}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
              />
            </div>

            <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient || 'from-black/80 via-black/40 to-transparent'}`}></div>

            <div className="relative container mx-auto px-4 h-full flex items-center">
              <div className="max-w-4xl text-white pl-4 md:pl-12 border-l-4 border-rose-600/0 md:border-rose-600/80 transition-all duration-1000 delay-300">
                <p className={`text-rose-400 font-bold tracking-[0.2em] uppercase mb-4 text-sm md:text-base transform transition-all duration-700 delay-100 ${index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                  {slide.subtitle}
                </p>
                <h1 className={`text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tighter leading-tight transform transition-all duration-700 delay-200 ${index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                  {slide.title}
                </h1>
                <p className={`text-lg md:text-xl text-slate-300 mb-10 max-w-2xl font-light leading-relaxed transform transition-all duration-700 delay-300 ${index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                  {slide.description}
                </p>
                <div className={`transform transition-all duration-700 delay-400 ${index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                  <Link
                    to={slide.ctaLink || '/products'}
                    className="group inline-flex items-center px-8 py-4 bg-white text-slate-900 font-bold text-sm tracking-widest uppercase hover:bg-rose-600 hover:text-white transition-all duration-300"
                  >
                    {slide.ctaText || 'Shop Now'}
                    <FaArrowRight className="ml-3 transition-transform group-hover:translate-x-2" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Minimalist Slider Controls */}
        <div className="absolute bottom-12 left-0 right-0 z-20 container mx-auto px-4">
          <div className="flex items-center justify-between border-t border-white/10 pt-6">
            <div className="flex space-x-4">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1 transition-all duration-500 ${currentSlide === index ? 'w-16 bg-rose-500' : 'w-8 bg-white/30 hover:bg-white/50'}`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <div className="flex space-x-2">
              <button onClick={prevSlide} className="w-12 h-12 flex items-center justify-center border border-white/20 text-white hover:bg-white hover:text-slate-900 transition-all duration-300">
                <FaChevronLeft />
              </button>
              <button onClick={nextSlide} className="w-12 h-12 flex items-center justify-center border border-white/20 text-white hover:bg-white hover:text-slate-900 transition-all duration-300">
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee Offers */}
      <section id="marquee-offers" data-animate className="py-10 relative z-10 overflow-hidden">
        {marqueeOffers.length > 3 ? (
          <div className="flex animate-marquee hover:pause">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex space-x-8 shrink-0 pr-8">
                {marqueeOffers.map((offer, index) => (
                  <div key={`${i}-${index}`} className="rounded-2xl p-6 flex items-center space-x-4 hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-w-[300px]">
                    <div className="bg-rose-100 rounded-full w-12 h-12 flex items-center justify-center text-2xl">{offer.icon}</div>
                    <div><h3 className="font-bold">{offer.title}</h3><p className="text-sm text-slate-500">{offer.description}</p></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center flex-wrap gap-8 px-4">
            {marqueeOffers.map((offer, index) => (
              <div key={index} className="rounded-2xl p-6 flex items-center space-x-4 bg-white shadow-sm border border-slate-100 min-w-[300px]">
                <div className="bg-rose-100 rounded-full w-12 h-12 flex items-center justify-center text-2xl">{offer.icon}</div>
                <div><h3 className="font-bold">{offer.title}</h3><p className="text-sm text-slate-500">{offer.description}</p></div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section id="categories" data-animate className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-rose-500 font-semibold tracking-wider uppercase text-sm block mb-2">Collections</span>
            <h2 className="text-4xl font-bold mb-4">Shop by Category</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {categories.map((cat, idx) => (
              <Link key={idx} to={cat.link} className="group relative overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 block bg-white">
                <div className="aspect-[4/5] relative">
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-white text-xl font-bold">{cat.name}</h3>
                    <p className="text-slate-300 text-sm opacity-0 group-hover:opacity-100 transition-opacity">{cat.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section id="new-arrivals" data-animate className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl font-bold mb-2">New Arrivals</h2>
              <p className="text-slate-500">Discover our latest additions</p>
            </div>
            <Link to="/products?sort=date-desc" className="text-rose-600 font-bold hover:text-rose-700 transition flex items-center gap-2">View All <FaArrowRight /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {newArrivals.map((product) => (
              <Link key={product.id} to={`/product/${product.id}`} className="group block">
                <div className="relative overflow-hidden rounded-2xl mb-4 aspect-square bg-gray-100">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <span className="absolute top-4 left-4 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full">NEW</span>
                </div>
                <h3 className="font-bold text-lg mb-1 group-hover:text-rose-600 transition-colors">{product.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-rose-600 font-bold">₹{product.price}</span>
                  {product.originalPrice > product.price && (
                    <span className="text-slate-400 text-sm line-through">₹{product.originalPrice}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by Shade */}
      <section id="shop-by-shade" data-animate className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-12 text-center">Shop by Shade</h2>
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {colors.map((color, i) => (
              <button
                key={i}
                onClick={() => setSelectedColor(color.name === selectedColor ? null : color.name)}
                className={`w-12 h-12 rounded-full bg-gradient-to-br ${color.gradient} border-2 transition-transform hover:scale-110 ${selectedColor === color.name ? 'border-white scale-110 ring-2 ring-rose-500' : 'border-transparent'}`}
                title={color.name}
              />
            ))}
          </div>
          {selectedColor && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-fade-in-up">
              {loadingColorProducts ? (
                [...Array(4)].map((_, i) => <div key={i} className="h-80 bg-slate-800 rounded-2xl animate-pulse" />)
              ) : colorProducts.length > 0 ? (
                colorProducts.map((p) => (
                  <Link key={p.id} to={`/product/${p.id}`} className="group block bg-slate-800 rounded-2xl p-4 hover:bg-slate-700 transition">
                    <div className="aspect-square rounded-xl overflow-hidden mb-4"><img src={p.image} className="w-full h-full object-cover" /></div>
                    <h3 className="font-bold text-lg">{p.name}</h3>
                    <p className="text-rose-400 font-bold">₹{p.price}</p>
                  </Link>
                ))
              ) : (
                <div className="col-span-full text-center text-slate-400 py-10">No products found in {selectedColor}</div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-rose-50">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.slice(0, 3).map((feature, i) => (
            <div key={i} className={`bg-gradient-to-br ${feature.bgColor} p-8 rounded-3xl`}>
              <div className="mb-4 text-rose-600">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Combo Offers */}
      {comboOffers.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold mb-12 text-center">Exclusive Combos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {comboOffers.map((offer, i) => (
                <Link key={i} to={`/combo-offers/${offer._id}`} className="relative h-96 rounded-3xl overflow-hidden group">
                  <img src={offer.image || offer.items?.[0]?.product?.images?.[0] || "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&q=80"} alt={offer.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-8 text-white">
                    <h3 className="text-3xl font-bold mb-2">{offer.name}</h3>
                    <p className="text-xl font-bold text-rose-400">₹{offer.finalPrice} <span className="line-through text-white/60 text-base">₹{offer.totalPrice}</span></p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="py-20 bg-slate-900 text-white text-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-4xl font-bold mb-6">Join the Journey</h2>
          <p className="text-slate-400 mb-8">Subscribe to our newsletter for exclusive offers and travel tips.</p>
          <div className="flex gap-2">
            <input type="email" placeholder="Your email address" className="flex-1 px-6 py-4 rounded-full bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-rose-500" />
            <button className="px-8 py-4 bg-rose-600 rounded-full font-bold hover:bg-rose-700 transition">Subscribe</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
