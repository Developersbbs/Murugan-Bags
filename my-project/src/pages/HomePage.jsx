import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { Link } from 'react-router-dom';
import { FaShoppingBag, FaSuitcaseRolling, FaSchool, FaLaptop, FaTruck, FaShieldAlt, FaCreditCard, FaHeadset, FaArrowRight, FaChevronLeft, FaChevronRight, FaStar, FaEnvelope, FaHeart } from 'react-icons/fa';
import OfferPopup from '../components/OfferPopup';

const colorGradients = {
  "Black": "from-gray-900 to-black",
  "Red": "from-red-600 to-red-800",
  "Blue": "from-blue-600 to-blue-800",
  "Green": "from-green-600 to-green-800",
  "Brown": "from-amber-800 to-amber-950",
  "Navy": "from-blue-900 to-blue-950",
  "Gray": "from-gray-600 to-gray-800",
  "Purple": "from-purple-600 to-purple-800",
  "Yellow": "from-yellow-400 to-yellow-600",
  "Orange": "from-orange-500 to-orange-700",
  "Pink": "from-pink-500 to-pink-700",
  "White": "from-gray-100 to-white",
  "Beige": "from-orange-100 to-orange-200",
  "Maroon": "from-red-800 to-red-950",
  "Teal": "from-teal-500 to-teal-700",
  "Gold": "from-yellow-500 to-yellow-700",
  "Silver": "from-gray-300 to-gray-500",
  "Coral": "from-rose-400 to-orange-400",
  "default": "from-slate-400 to-slate-600"
};

const HomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [comboOffers, setComboOffers] = useState([]);
  const [marqueeOffers, setMarqueeOffers] = useState([
    { title: "Free Shipping", description: "On orders above ₹999", icon: "🚚" },
    { title: "Buy 1 Get 1", description: "On selected items", icon: "🎁" },
    { title: "Flat 40% Off", description: "On combo packs", icon: "🔥" },
    { title: "New Arrivals", description: "Check out latest trends", icon: "✨" },
    { title: "Easy Returns", description: "7-day return policy", icon: "↩️" }
  ]);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [scrollY, setScrollY] = useState(0);

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

  // Hero Slider Images
  const [heroSlides, setHeroSlides] = useState([]);
  const [loadingHero, setLoadingHero] = useState(true);

  useEffect(() => {
    const fetchHeroSlides = async () => {
      try {
        const API_URL = API_BASE_URL;
        console.log('Fetching hero slides from:', `${API_URL}/hero-section`);

        const res = await fetch(`${API_URL}/hero-section`);
        const data = await res.json();

        console.log('Hero slides response:', data);

        if (data.success && data.data.length > 0) {
          // Fix image URLs to include backend base URL
          const slidesWithFixedImages = data.data.map(slide => ({
            ...slide,
            image: slide.image.startsWith('http')
              ? slide.image
              : `http://localhost:5000${slide.image}`
          }));

          console.log('Setting hero slides:', slidesWithFixedImages);
          setHeroSlides(slidesWithFixedImages);
        } else {
          console.log('No dynamic slides found, using fallback');
          // Fallback to default slides if no dynamic slides found
          setHeroSlides([
            {
              id: 1,
              title: "ELEVATE YOUR JOURNEY",
              subtitle: "Premium Travel Collection",
              description: "Experience the perfect blend of durability and sophistication. Designed for the modern explorer.",
              image: "/images/hero/slide1.jpg",
              ctaText: "Shop Collection",
              ctaLink: "/products",
              gradient: "from-black/90 via-black/40 to-transparent"
            },
            {
              id: 2,
              title: "REDEFINE STYLE",
              subtitle: "New Arrivals 2024",
              description: "Contemporary designs that make a statement. functionality meets high-end fashion.",
              image: "/images/hero/slide2.jpg",
              ctaText: "Discover More",
              ctaLink: "/products",
              gradient: "from-slate-900/90 via-slate-900/40 to-transparent"
            },
            {
              id: 3,
              title: "SMART SAVINGS",
              subtitle: "Exclusive Combo Offers",
              description: "Curated sets for the savvy traveler. Get more value without compromising on quality.",
              image: "/images/hero/slide3.jpg",
              ctaText: "View Offers",
              ctaLink: "/combo-offers",
              gradient: "from-black/90 via-slate-900/40 to-transparent"
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching hero slides:', error);
        // Set fallback slides on error
        setHeroSlides([
          {
            id: 1,
            title: "ELEVATE YOUR JOURNEY",
            subtitle: "Premium Travel Collection",
            description: "Experience the perfect blend of durability and sophistication.",
            image: "/images/hero/slide1.jpg",
            ctaText: "Shop Collection",
            ctaLink: "/products",
            gradient: "from-black/90 via-black/40 to-transparent"
          }
        ]);
      } finally {
        setLoadingHero(false);
      }
    };

    fetchHeroSlides();
  }, []);

  // Auto-slide effect
  useEffect(() => {
    if (heroSlides.length === 0) return; // Don't start timer if no slides

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]); // Add dependency on heroSlides.length

  // Preload images
  useEffect(() => {
    if (heroSlides.length === 0) return;

    heroSlides.forEach(slide => {
      const img = new Image();
      img.src = slide.image;
    });
  }, [heroSlides]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  // Categories Data - Fetch from backend
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const API_URL = API_BASE_URL;
        console.log('Fetching categories from:', `${API_URL}/categories`);

        const res = await fetch(`${API_URL}/categories`);
        const data = await res.json();

        console.log('Categories response:', data);

        if (data.success && data.data && data.data.length > 0) {
          // Map backend categories to frontend format
          const mappedCategories = data.data.map((cat, index) => {
            // Backend returns image_url field (Firebase URLs are already complete)
            let imageUrl = cat.image_url || cat.image; // Try both fields for compatibility

            console.log(`Category ${index} (${cat.name}):`, {
              originalImage: cat.image_url,
              fallbackImage: cat.image,
              isFirebaseUrl: imageUrl && imageUrl.includes('firebase'),
              fullData: cat
            });

            // Firebase URLs are already complete, no need to prepend backend URL
            // Only prepend if it's a relative path (starts with /)
            if (imageUrl && imageUrl.startsWith('/')) {
              imageUrl = `http://localhost:5000${imageUrl}`;
            }

            console.log(`  → Final image URL: ${imageUrl}`);

            return {
              name: cat.name,
              icon: <FaShoppingBag className="w-10 h-10" />,
              image: imageUrl || "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=400&h=300&fit=crop",
              link: `/products?category=${cat.slug || cat.name}`,
              description: cat.description || "Shop Now"
            };
          });

          console.log('Setting categories with images:', mappedCategories);
          setCategories(mappedCategories);
        } else {
          console.log('No categories found, using fallback');
          // Fallback categories
          setCategories([
            {
              name: "BackPacks",
              icon: <FaShoppingBag className="w-10 h-10" />,
              image: "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=400&h=300&fit=crop",
              link: "/products?category=BackPacks",
              description: "Stylish & Functional"
            },
            {
              name: "Trolley Bags",
              icon: <FaSuitcaseRolling className="w-10 h-10" />,
              image: "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=400&h=300&fit=crop",
              link: "/products?category=Trolley Bags",
              description: "Travel in Comfort"
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback on error
        setCategories([
          {
            name: "BackPacks",
            icon: <FaShoppingBag className="w-10 h-10" />,
            image: "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=400&h=300&fit=crop",
            link: "/products",
            description: "Shop Now"
          }
        ]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // New Arrivals Data - Fetch from backend
  const [newArrivals, setNewArrivals] = useState([]);
  const [loadingNewArrivals, setLoadingNewArrivals] = useState(true);

  useEffect(() => {
    const processProducts = (products) => {
      const mappedProducts = products.map(product => {
        let imageUrl = product.image_url?.[0] || product.images?.[0];

        // If no main image, check variants
        if (!imageUrl && product.product_variants && product.product_variants.length > 0) {
          const variant = product.product_variants[0];
          imageUrl = variant.images?.[0] || variant.image_url?.[0] || variant.image;
        }

        if (imageUrl && imageUrl.startsWith('/')) {
          imageUrl = `http://localhost:5000${imageUrl}`;
        }

        let price = product.selling_price || product.price;
        let originalPrice = product.cost_price;

        // If no price, check variants
        if ((!price || price === 0) && product.product_variants && product.product_variants.length > 0) {
          const variant = product.product_variants[0];
          price = variant.selling_price || variant.price || variant.salesPrice;
          originalPrice = variant.cost_price || variant.original_price || variant.costPrice;
        }

        return {
          id: product._id,
          name: product.name,
          price: price,
          originalPrice: originalPrice,
          image: imageUrl || "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=400&h=400&fit=crop",
          badge: "NEW",
          rating: product.rating || 4.5
        };
      });

      console.log('Setting new arrivals:', mappedProducts);
      setNewArrivals(mappedProducts);
    };

    const fetchNewArrivals = async () => {
      try {
        const API_URL = API_BASE_URL;
        console.log('Fetching new arrivals from:', `${API_URL}/products`);

        const res = await fetch(`${API_URL}/products?page=1&limit=4&isNewArrival=true&published=true`);
        const data = await res.json();

        console.log('New arrivals response:', data);

        let finalProducts = [];

        if (data.success && data.data) {
          finalProducts = data.data;
        }

        // If we have fewer than 4 items, fetch latest products to fill the gap
        if (finalProducts.length < 4) {
          console.log(`Only found ${finalProducts.length} New Arrivals, fetching latest products to fill gaps...`);

          const fallbackRes = await fetch(`${API_URL}/products?page=1&limit=10&sort=date-desc&published=true`);
          const fallbackData = await fallbackRes.json();

          if (fallbackData.success && fallbackData.data && fallbackData.data.length > 0) {
            // Filter out products that are already in finalProducts (avoid duplicates)
            const existingIds = new Set(finalProducts.map(p => p._id));
            const newItems = fallbackData.data.filter(p => !existingIds.has(p._id));

            // Add enough items to reach 4
            const needed = 4 - finalProducts.length;
            finalProducts = [...finalProducts, ...newItems.slice(0, needed)];
          }
        }

        if (finalProducts.length > 0) {
          processProducts(finalProducts);
        } else {
          setNewArrivals([]);
        }
      } catch (error) {
        console.error('Error fetching new arrivals:', error);
        setNewArrivals([]);
      } finally {
        setLoadingNewArrivals(false);
      }
    };

    fetchNewArrivals();
  }, []);

  // Shop by Shade Logic
  const [colors, setColors] = useState([]);
  const [loadingColors, setLoadingColors] = useState(true);
  const [colorProducts, setColorProducts] = useState([]);
  const [loadingColorProducts, setLoadingColorProducts] = useState(false);

  // Fetch unique colors
  useEffect(() => {
    const fetchColors = async () => {
      try {
        const API_URL = API_BASE_URL;
        const res = await fetch(`${API_URL}/products/colors`);
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
          // Map colors to gradients
          const mappedColors = data.data.map(colorName => ({
            name: colorName,
            gradient: colorGradients[colorName] || colorGradients['default']
          }));
          setColors(mappedColors);
        } else {
          // Fallback colors if no colors found in DB
          setColors([
            { name: "Black", gradient: "from-gray-900 to-black" },
            { name: "Red", gradient: "from-red-600 to-red-800" },
            { name: "Blue", gradient: "from-blue-600 to-blue-800" },
            { name: "Green", gradient: "from-green-600 to-green-800" },
            { name: "Yellow", gradient: "from-yellow-400 to-yellow-600" },
            { name: "Purple", gradient: "from-purple-600 to-purple-800" },
            { name: "Pink", gradient: "from-pink-500 to-pink-700" },
            { name: "White", gradient: "from-slate-100 to-white" }
          ]);
        }
      } catch (error) {
        console.error('Error fetching colors:', error);
        // Fallback colors
        setColors([
          { name: "Black", gradient: "from-gray-900 to-black" },
          { name: "Red", gradient: "from-red-600 to-red-800" },
          { name: "Blue", gradient: "from-blue-600 to-blue-800" }
        ]);
      } finally {
        setLoadingColors(false);
      }
    };

    fetchColors();
  }, []);

  // Fetch products for selected color
  useEffect(() => {
    if (!selectedColor) return;

    const fetchColorProducts = async () => {
      setLoadingColorProducts(true);
      try {
        const API_URL = API_BASE_URL;
        // Use regex search for color to be flexible
        const res = await fetch(`${API_URL}/products?color=${encodeURIComponent(selectedColor)}&limit=4`);
        const data = await res.json();

        if (data.success && data.data) {
          const mappedProducts = data.data.map(product => {
            let imageUrl = product.image_url?.[0] || product.images?.[0];
            let price = product.selling_price || product.price;
            let originalPrice = product.cost_price;

            // Find matching variant for the selected color
            if (product.product_variants && product.product_variants.length > 0) {
              const matchingVariant = product.product_variants.find(v => {
                if (!v.attributes) return false;

                // Helper to check attributes safely
                const getAttribute = (attr) => {
                  if (v.attributes instanceof Map) return v.attributes.get(attr);
                  return v.attributes[attr];
                };

                const colorAttr = getAttribute('Color') || getAttribute('color') || getAttribute('Colour') || getAttribute('colour');
                return colorAttr && colorAttr.toLowerCase() === selectedColor.toLowerCase();
              });

              // Use matching variant if found, otherwise fallback to first variant
              const variantToUse = matchingVariant || product.product_variants[0];

              if (variantToUse) {
                imageUrl = variantToUse.images?.[0] || variantToUse.image_url?.[0] || variantToUse.image || imageUrl;
                price = variantToUse.selling_price || variantToUse.price || variantToUse.salesPrice || price;
                originalPrice = variantToUse.cost_price || variantToUse.original_price || variantToUse.costPrice || originalPrice;
              }
            }

            if (imageUrl && imageUrl.startsWith('/')) {
              imageUrl = `http://localhost:5000${imageUrl}`;
            }

            return {
              id: product._id,
              name: product.name,
              price: price,
              originalPrice: originalPrice,
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

  // Why Shop With Us Features - Dynamic from backend
  const [features, setFeatures] = useState([
    {
      icon: <FaShoppingBag className="w-8 h-8" />,
      title: "Unique Catalogue",
      description: "Exclusive designs you won't find anywhere else",
      bgColor: "from-rose-50 to-rose-100"
    },
    {
      icon: <FaTruck className="w-8 h-8" />,
      title: "Shipping & Returns",
      description: "Free shipping on orders above ₹999 & easy returns",
      bgColor: "from-blue-50 to-blue-100"
    },
    {
      icon: <FaShieldAlt className="w-8 h-8" />,
      title: "Secure Payment",
      description: "100% secure payment with multiple options",
      bgColor: "from-green-50 to-green-100"
    },
    {
      icon: <FaCreditCard className="w-8 h-8" />,
      title: "Buy More Save More",
      description: "Special discounts on bulk orders",
      bgColor: "from-purple-50 to-purple-100"
    },
    {
      icon: <FaStar className="w-8 h-8" />,
      title: "Warranty",
      description: "1-year warranty on all products",
      bgColor: "from-amber-50 to-amber-100"
    },
    {
      icon: <FaHeadset className="w-8 h-8" />,
      title: "24/7 Support",
      description: "Dedicated customer support team",
      bgColor: "from-slate-50 to-slate-100"
    }
  ]);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const API_URL = API_BASE_URL;
        const res = await fetch(`${API_URL}/special-offers`);
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
          const iconMap = {
            'FaGift': FaShoppingBag,
            'FaTruck': FaTruck,
            'FaShieldAlt': FaShieldAlt,
            'FaCreditCard': FaCreditCard,
            'FaStar': FaStar,
            'FaHeadset': FaHeadset
          };

          const mappedFeatures = data.data.map(offer => ({
            icon: React.createElement(iconMap[offer.icon] || FaShoppingBag, { className: "w-8 h-8" }),
            title: offer.title,
            description: offer.description,
            bgColor: offer.bgColor || 'from-rose-50 to-rose-100'
          }));

          setFeatures(mappedFeatures);
        }
      } catch (error) {
        console.error('Error fetching special offers:', error);
      }
    };

    fetchFeatures();
  }, []);

  // Combo Offers - Fetch from backend
  useEffect(() => {
    const fetchComboOffers = async () => {
      try {
        const API_URL = API_BASE_URL;
        const res = await fetch(`${API_URL}/combo-offers?isHomeFeatured=true&limit=2`);
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
          setComboOffers(data.data);
        }
      } catch (error) {
        console.error('Error fetching combo offers:', error);
      }
    };

    fetchComboOffers();
  }, []);

  // Marquee Offers - Fetch from backend
  useEffect(() => {
    const fetchMarqueeOffers = async () => {
      try {
        const API_URL = API_BASE_URL;
        const res = await fetch(`${API_URL}/marquee-offers`);
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
          setMarqueeOffers(data.data);
        }
      } catch (error) {
        console.error('Error fetching marquee offers:', error);
      }
    };

    fetchMarqueeOffers();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden font-sans -mt-20">
      {/* Offer Popup */}
      <OfferPopup />

      {/* Hero Section - Professional Redesign */}
      <section className="relative h-screen min-h-[600px] overflow-hidden bg-slate-900">
        {heroSlides.map((slide, index) => (
          <div
            key={`hero-slide-${index}`}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
          >
            {/* Background Image with Parallax */}
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

            {/* Sophisticated Gradient Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`}></div>

            {/* Content Container */}
            <div className="relative container mx-auto px-4 h-full flex items-center">
              <div className="max-w-4xl text-white pl-4 md:pl-12 border-l-4 border-rose-600/0 md:border-rose-600/80 transition-all duration-1000 delay-300">
                <p className={`text-rose-400 font-bold tracking-[0.2em] uppercase mb-4 text-sm md:text-base transform transition-all duration-700 delay-100 ${index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  }`}>
                  {slide.subtitle}
                </p>

                <h1 className={`text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tighter leading-tight transform transition-all duration-700 delay-200 ${index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  }`}>
                  {slide.title}
                </h1>

                <p className={`text-lg md:text-xl text-slate-300 mb-10 max-w-2xl font-light leading-relaxed transform transition-all duration-700 delay-300 ${index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  }`}>
                  {slide.description}
                </p>

                <div className={`transform transition-all duration-700 delay-400 ${index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  }`}>
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
            {/* Progress Indicators */}
            <div className="flex space-x-4">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1 transition-all duration-500 ${currentSlide === index ? 'w-16 bg-rose-500' : 'w-8 bg-white/30 hover:bg-white/50'
                    }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            {/* Navigation Arrows */}
            <div className="flex space-x-2">
              <button
                onClick={prevSlide}
                className="w-12 h-12 flex items-center justify-center border border-white/20 text-white hover:bg-white hover:text-slate-900 transition-all duration-300"
              >
                <FaChevronLeft />
              </button>
              <button
                onClick={nextSlide}
                className="w-12 h-12 flex items-center justify-center border border-white/20 text-white hover:bg-white hover:text-slate-900 transition-all duration-300"
              >
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
                  <div
                    key={`${i}-${index}`}
                    className="rounded-2xl p-6 flex items-center space-x-4 hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-w-[300px]"
                  >
                    <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-2xl shadow-inner">
                      {offer.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{offer.title}</h3>
                      <p className="text-slate-500 text-sm">{offer.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center flex-wrap gap-8 px-4">
            {marqueeOffers.map((offer, index) => (
              <div
                key={index}
                className="rounded-2xl p-6 flex items-center space-x-4 hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer min-w-[300px] bg-white shadow-sm border border-slate-100"
                style={{
                  animation: visibleSections.has('marquee-offers') ? `fadeInUp 0.5s ease-out ${index * 0.1}s both` : 'none'
                }}
              >
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-2xl shadow-inner">
                  {offer.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{offer.title}</h3>
                  <p className="text-slate-500 text-sm">{offer.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Categories Section */}
      <section id="categories" data-animate className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-rose-500 font-semibold tracking-wider uppercase text-sm mb-2 block animate-fade-in-up">Collections</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 animate-text-reveal">
              Shop by <span className="text-rose-600 relative inline-block">
                Category
                <svg className="absolute w-full h-3 -bottom-1 left-0 text-rose-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                </svg>
              </span>
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">Find the perfect bag for every occasion, designed with style and functionality in mind.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {categories.map((category, index) => (
              <Link
                key={index}
                to={`/products?category=${encodeURIComponent(category.name)}`}
                className="group relative overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 bg-white cursor-pointer block"
                style={{
                  animation: visibleSections.has('categories') ? `fadeInUp 0.6s ease-out ${index * 0.1}s both` : 'none'
                }}
              >
                <div className="aspect-[4/5] overflow-hidden relative">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 800 600' preserveAspectRatio='none'%3E%3Crect width='800' height='600' fill='%23f1f5f9'/%3E%3Ctext x='400' y='300' font-family='sans-serif' font-size='48' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300"></div>

                  <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white mb-4 group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300 shadow-lg">
                      {category.icon}
                    </div>
                    <h3 className="text-white text-xl font-bold mb-1">{category.name}</h3>
                    <p className="text-slate-300 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">{category.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals Section */}
      <section id="new-arrivals" data-animate className="py-20 bg-white relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-50 rounded-full blur-3xl -z-10 opacity-50 transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-50 rounded-full blur-3xl -z-10 opacity-50 transform -translate-x-1/2 translate-y-1/2"></div>

        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block bg-rose-100 text-rose-600 px-4 py-1.5 rounded-full text-xs font-bold mb-4 animate-pulse tracking-wider">
              FRESH DROPS
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 animate-text-reveal">
              New <span className="text-rose-600">Arrivals</span>
            </h2>
            <p className="text-lg text-slate-500">Check out our latest collection of premium bags.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {newArrivals.map((product, index) => (
              <div
                key={product._id || product.id}
                className="group bg-white rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-slate-100 overflow-hidden"
                style={{
                  animation: visibleSections.has('new-arrivals') ? `fadeInUp 0.6s ease-out ${index * 0.1}s both` : 'none'
                }}
              >
                <div className="relative overflow-hidden aspect-square bg-slate-100">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 800 600' preserveAspectRatio='none'%3E%3Crect width='800' height='600' fill='%23f1f5f9'/%3E%3Ctext x='400' y='300' font-family='sans-serif' font-size='48' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  <div className="absolute top-4 left-4 bg-rose-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                    {product.badge}
                  </div>
                  <button className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 shadow-md transition-all duration-300">
                    <FaHeart />
                  </button>
                </div>
                <div className="p-6">
                  <div className="flex items-center mb-2 space-x-1">
                    <FaStar className="text-amber-400 w-4 h-4" />
                    <span className="text-sm font-bold text-slate-700">{product.rating}</span>
                    <span className="text-xs text-slate-400">(120+ reviews)</span>
                  </div>
                  <h3 className="text-lg font-bold mb-3 text-slate-800 group-hover:text-rose-600 transition-colors duration-300 truncate">{product.name}</h3>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-2xl font-bold text-slate-900">₹{product.price}</span>
                      <span className="text-sm text-slate-400 line-through ml-2">₹{product.originalPrice}</span>
                    </div>
                  </div>
                  <button className="w-full bg-slate-900 hover:bg-rose-600 text-white py-3 rounded-xl font-bold transition-all duration-300 transform active:scale-95 shadow-lg hover:shadow-rose-500/30 flex items-center justify-center">
                    <FaShoppingBag className="mr-2" /> Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div >

          <div className="text-center mt-16">
            <Link
              to="/products"
              className="inline-flex items-center px-10 py-4 bg-white text-slate-900 font-bold rounded-full hover:bg-slate-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl border border-slate-200 group"
            >
              View All Products
              <FaArrowRight className="ml-2 text-rose-500 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div >
      </section >

      {/* Combos & Offers Section */}
      {
        comboOffers.length > 0 && (
          <section id="combos" data-animate className="py-24 bg-slate-900 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-rose-900/20 to-slate-900/80 z-0"></div>

            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-4 animate-text-reveal">Special Combo Offers</h2>
                <p className="text-xl text-slate-300">Save big with our exclusive combo deals designed for you.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {comboOffers.map((combo, index) => (
                  <Link
                    to={`/combo-offers/${combo._id}`}
                    key={combo._id || index}
                    className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-10 border border-slate-700 hover:border-rose-500/50 transition-all duration-500 transform hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden group block"
                    style={{
                      animation: visibleSections.has('combos') ? `fadeInUp 0.6s ease-out ${index * 0.2}s both` : 'none'
                    }}
                  >
                    {combo.isLimitedTime && (
                      <div className="absolute top-0 right-0 bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-bl-2xl shadow-lg">
                        LIMITED TIME
                      </div>
                    )}
                    <h3 className="text-3xl font-bold mb-4 group-hover:text-rose-400 transition-colors">{combo.title}</h3>
                    <p className="text-slate-300 mb-8 text-lg">{combo.description}</p>
                    <div className="flex items-baseline mb-8">
                      <span className="text-5xl font-bold text-white">₹{combo.price.toLocaleString()}</span>
                      <span className="text-xl text-slate-400 line-through ml-4">₹{combo.originalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-bold border border-emerald-500/30">
                        Save {combo.savingsPercent}%
                      </span>
                      <button className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-rose-500 hover:text-white transition-all duration-300 shadow-lg">
                        Shop Now
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )
      }

      {/* Shop By Shade */}
      <section id="colors" data-animate className="pt-20 pb-8 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-slate-900 animate-text-reveal">
              Shop by <span className="text-rose-600">Shade</span>
            </h2>
            <p className="text-lg text-slate-500">Find a bag that matches your personality.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6">
            {colors.map((color, index) => (
              <div
                key={index}
                className="flex flex-col items-center"
                style={{
                  animation: visibleSections.has('colors') ? `fadeInUp 0.4s ease-out ${index * 0.05}s both` : 'none'
                }}
              >
                <button
                  onClick={() => setSelectedColor(color.name)}
                  className={`group relative w-16 h-16 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-110 ${selectedColor === color.name ? 'ring-4 ring-rose-500 scale-110' : ''
                    }`}
                >
                  <div className={`w-full h-full bg-gradient-to-br ${color.gradient}`}></div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-all duration-300"></div>
                </button>
                <span className={`mt-3 text-base font-semibold transition-colors duration-300 ${selectedColor === color.name ? 'text-rose-600' : 'text-slate-700'}`}>
                  {color.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Color-specific Bags Section */}
      {
        selectedColor && (
          <section id="color-bags" className="pt-4 pb-20 bg-slate-50">
            <div className="container mx-auto px-4">
              <h2 className="text-4xl font-bold mb-4 text-slate-900">
                {selectedColor} <span className="text-rose-600">Collection</span>
              </h2>
              <p className="text-lg text-slate-500 mb-10">Discover our premium {selectedColor.toLowerCase()} bags</p>

              {loadingColorProducts ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
                </div>
              ) : colorProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {colorProducts.map((product, index) => (
                      <div key={product.id || index} className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                        <div className="aspect-square overflow-hidden bg-slate-100 relative">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            loading="lazy"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 800 600' preserveAspectRatio='none'%3E%3Crect width='800' height='600' fill='%23f1f5f9'/%3E%3Ctext x='400' y='300' font-family='sans-serif' font-size='48' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
                            }}
                          />
                          <div className="absolute top-4 right-4 bg-rose-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                            NEW
                          </div>
                        </div>
                        <div className="p-6">
                          <h3 className="text-lg font-bold mb-3 text-slate-800 group-hover:text-rose-600 transition-colors duration-300">{product.name}</h3>
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <span className="text-2xl font-bold text-slate-900">₹{product.price}</span>
                              {product.originalPrice && (
                                <span className="text-sm text-slate-400 line-through ml-2">₹{product.originalPrice}</span>
                              )}
                            </div>
                          </div>
                          <button className="w-full bg-slate-900 hover:bg-rose-600 text-white py-3 rounded-xl font-bold transition-all duration-300 transform active:scale-95 shadow-lg hover:shadow-rose-500/30 flex items-center justify-center">
                            <FaShoppingBag className="mr-2" /> Add to Cart
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center mt-12">
                    <Link
                      to={`/products?color=${encodeURIComponent(selectedColor)}`}
                      className="inline-flex items-center px-8 py-3 bg-white text-slate-900 border border-slate-200 rounded-full font-bold hover:bg-rose-600 hover:text-white hover:border-transparent transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg group"
                    >
                      View More {selectedColor} Bags
                      <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-center py-10">
                  <p className="text-xl text-slate-500">No products found in {selectedColor}.</p>
                  <button
                    onClick={() => setSelectedColor(null)}
                    className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-full hover:bg-rose-600 transition-colors"
                  >
                    View All Colors
                  </button>
                </div>
              )}
            </div>
          </section>
        )
      }

      {/* Why Shop With Us */}
      <section id="features" data-animate className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-slate-900 animate-text-reveal leading-normal pb-2">
              Why Shop <span className="text-rose-600">With Us?</span>
            </h2>
            <p className="text-lg text-slate-500">Experience the Murugan Bags difference.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group bg-gradient-to-br ${feature.bgColor || 'from-slate-50 to-slate-100'} rounded-3xl p-8 hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 border border-slate-100`}
                style={{
                  animation: visibleSections.has('features') ? `fadeInUp 0.6s ease-out ${index * 0.1}s both` : 'none'
                }}
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-rose-600 mb-6 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300 shadow-md group-hover:shadow-rose-500/30">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-800 group-hover:text-rose-600 transition-colors duration-300">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" data-animate className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-900/40 via-slate-900 to-slate-900"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl font-bold mb-10 tracking-tight animate-text-reveal leading-normal pb-2">About Us</h2>
            <div className="text-xl leading-relaxed space-y-6 text-slate-300">
              <p className="animate-fade-in">
                Travel is more than movement — it's a part of every person's story. At Murugan Bags, we believe that every journey deserves to be smooth, stress-free, and truly memorable. Our mission is to empower travellers with products that combine comfort, durability, and modern design.
              </p>
              <p className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                We create thoughtfully engineered luggage and backpacks built for real-world use. From daily commuters to frequent flyers, our designs focus on practicality, smart organization, and long-lasting quality. Every bag is crafted with the needs of today's travellers in mind — lightweight, stylish, and ready for any adventure.
              </p>
              <p className="text-2xl font-bold text-white animate-fade-in pt-4" style={{ animationDelay: '0.4s' }}>
                With Murugan Bags by your side, exploring the world becomes effortless. Wherever you're headed, we ensure you travel smarter, safer, and more comfortably.
              </p>
            </div>
            <div className="mt-16">
              <Link
                to="/products"
                className="inline-flex items-center px-8 py-4 bg-white text-slate-900 rounded-full font-bold hover:bg-rose-600 hover:text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-rose-500/30 group"
              >
                Shop Now <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section removed as per user request */}

      {/* Add keyframes for animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }
      `}</style>
    </div >
  );
};

export default HomePage;
