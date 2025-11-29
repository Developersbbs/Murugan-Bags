import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaShoppingCart, FaUser, FaSearch, FaBars, FaTimes, FaHeart, FaShoppingBag, FaSuitcaseRolling, FaSchool, FaLaptop } from 'react-icons/fa';
import { useSelector, useDispatch } from 'react-redux';
import { userLogout, forceLogout, fetchUserProfile } from '../../redux/slices/authSlice';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState(false);
  const [categoryTimeout, setCategoryTimeout] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [megaMenuCategories, setMegaMenuCategories] = useState([
    {
      name: "BackPacks",
      path: "/products?category=BackPacks",
      icon: <FaShoppingBag className="w-8 h-8 mb-2 text-rose-500" />,
      desc: "Stylish & Functional",
      image: "https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=400&h=300&fit=crop"
    },
    {
      name: "Trolley Bags",
      path: "/products?category=Trolley Bags",
      icon: <FaSuitcaseRolling className="w-8 h-8 mb-2 text-rose-500" />,
      desc: "Travel in Comfort",
      image: "/images/hero/slide1.jpg"
    },
    {
      name: "Rolling Duffle",
      path: "/products?category=Rolling Duffle",
      icon: <FaSuitcaseRolling className="w-8 h-8 mb-2 text-rose-500" />,
      desc: "Versatile & Spacious",
      image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop"
    },
    {
      name: "School Bags",
      path: "/products?category=School Bags",
      icon: <FaSchool className="w-8 h-8 mb-2 text-rose-500" />,
      desc: "Perfect for Students",
      image: "https://images.unsplash.com/photo-1588072432836-e10032774350?w=400&h=300&fit=crop"
    },
    {
      name: "Laptop Bags",
      path: "/products?category=Laptop Bags",
      icon: <FaLaptop className="w-8 h-8 mb-2 text-rose-500" />,
      desc: "Professional & Secure",
      image: "/images/hero/slide2.jpg"
    }
  ]);

  const location = useLocation();
  const isHome = location.pathname === '/';

  // Use new Context-based cart and wishlist
  const { itemCount: cartItemCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const { isAuthenticated, user, backendUser, backendUserLoading, loading } = useSelector((state) => state.auth);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch backend user if missing
  useEffect(() => {
    if (isAuthenticated && user?.uid && !backendUser && !backendUserLoading) {
      console.log('Header: Backend user missing, fetching...');
      dispatch(fetchUserProfile(user.uid));
    }
  }, [isAuthenticated, user, backendUser, backendUserLoading, dispatch]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    setIsProfileDropdownOpen(false);
    try {
      window.dispatchEvent(new CustomEvent('auth:logout'));
      dispatch(forceLogout());
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      dispatch(userLogout());
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      dispatch(forceLogout());
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      navigate('/login');
    }
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsProfileDropdownOpen(prev => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isProfileDropdownOpen) {
        const dropdown = document.querySelector('.profile-dropdown');
        const button = document.getElementById('profile-button');
        if (dropdown && !dropdown.contains(e.target) && button && !button.contains(e.target)) {
          setIsProfileDropdownOpen(false);
        }
      }
      if (isCategoryDropdownOpen) {
        const dropdown = document.querySelector('.mega-menu');
        const button = document.getElementById('category-button');
        if (dropdown && !dropdown.contains(e.target) && button && !button.contains(e.target)) {
          setIsCategoryDropdownOpen(false);
        }
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isProfileDropdownOpen, isCategoryDropdownOpen]);

  useEffect(() => {
    return () => {
      if (categoryTimeout) clearTimeout(categoryTimeout);
    };
  }, [categoryTimeout]);

  // Fetch categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${API_URL}/categories`);
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
          // Map backend categories to mega menu format
          const iconMap = {
            'BackPacks': <FaShoppingBag className="w-8 h-8 mb-2 text-rose-500" />,
            'Trolley Bags': <FaSuitcaseRolling className="w-8 h-8 mb-2 text-rose-500" />,
            'Rolling Duffle': <FaSuitcaseRolling className="w-8 h-8 mb-2 text-rose-500" />,
            'School Bags': <FaSchool className="w-8 h-8 mb-2 text-rose-500" />,
            'Laptop Bags': <FaLaptop className="w-8 h-8 mb-2 text-rose-500" />
          };

          const mappedCategories = data.data.map(cat => {
            // Get image URL
            let imageUrl = cat.image_url || cat.image;
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = `http://localhost:5000${imageUrl}`;
            }

            return {
              name: cat.name,
              path: `/products?category=${cat.slug || cat.name}`,
              icon: iconMap[cat.name] || <FaShoppingBag className="w-8 h-8 mb-2 text-rose-500" />,
              desc: cat.description || "Shop Now",
              image: imageUrl || "https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=400&h=300&fit=crop"
            };
          });

          setMegaMenuCategories(mappedCategories);
        }
      } catch (error) {
        console.error('Error fetching categories for header:', error);
      }
    };

    fetchCategories();
  }, []);


  const navItems = [
    { name: 'Combos', path: '/products?category=Combos' },
    { name: 'Bulk Orders', path: '/products?category=Bulk Orders' },
    { name: 'Discover More', path: '/products' },
    { name: 'New Arrivals', path: '/products?sort=newest' }
  ];

  // Determine styling based on route and scroll
  const isTransparent = isHome && !scrolled;
  const headerClass = isTransparent
    ? 'bg-gradient-to-b from-black/60 to-transparent'
    : 'bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20';

  const textColorClass = isTransparent ? 'text-white' : 'text-rose-600';
  const navTextClass = isTransparent ? 'text-white hover:bg-white/20' : 'text-slate-700 hover:bg-rose-50 hover:text-rose-600';
  const iconClass = isTransparent ? 'hover:bg-white/20 text-white' : 'hover:bg-rose-50 text-slate-600 hover:text-rose-600';

  return (
    <header className={`fixed w-full top-0 z-50 transition-all duration-300 ${headerClass}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group cursor-pointer">
            <img className='w-14 h-14 drop-shadow-md' src="/Asset 1 1.svg" alt="Murugan Bags Logo" />
            <span className={`text-2xl font-bold tracking-tight transition-colors duration-300 ${textColorClass}`}>
              <p>MURUGAN BAGS</p>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center space-x-1">
            {/* Categories Mega Menu */}
            <div className="relative" onMouseEnter={() => {
              if (categoryTimeout) clearTimeout(categoryTimeout);
              setIsCategoryDropdownOpen(true);
            }} onMouseLeave={() => {
              const timeout = setTimeout(() => {
                setIsCategoryDropdownOpen(false);
              }, 300);
              setCategoryTimeout(timeout);
            }}>
              <button id="category-button" className={`px-4 py-2 rounded-full font-medium flex items-center transition-all duration-300 ${navTextClass}`}>
                Categories
                <svg className={`w-4 h-4 ml-1 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Mega Menu Dropdown */}
              <div className={`mega-menu fixed left-0 right-0 mt-4 bg-white/90 backdrop-blur-xl shadow-2xl z-50 transition-all duration-300 transform origin-top border-t border-rose-100 ${isCategoryDropdownOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'
                }`}>
                <div className="container mx-auto px-4 py-8">
                  <div className="grid grid-cols-5 gap-6">
                    {megaMenuCategories.map((cat, index) => (
                      <Link to={cat.path} key={index} className="group cursor-pointer p-4 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300" onClick={() => setIsCategoryDropdownOpen(false)}>
                        <div className="aspect-video rounded-xl overflow-hidden mb-4 relative shadow-md group-hover:shadow-lg transition-all">
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              // Create a fallback div if it doesn't exist
                              const parent = e.target.parentElement;
                              if (parent) {
                                const fallback = document.createElement('div');
                                fallback.className = 'w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold';
                                fallback.innerText = cat.name;
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300"></div>
                        </div>
                        <div className="text-center">
                          <h3 className="font-bold text-slate-800 group-hover:text-rose-600 transition-colors text-lg">{cat.name}</h3>
                          <p className="text-xs text-slate-500 font-medium mt-1">{cat.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {navItems.map((item) => (
              <Link key={item.name} to={item.path} className={`px-4 py-2 rounded-full font-medium cursor-pointer transition-all duration-300 ${navTextClass}`}>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Search, Cart, and Auth */}
          <div className="hidden xl:flex items-center space-x-4">
            <form onSubmit={handleSearch} className="relative group">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className={`pl-10 pr-4 py-2.5 rounded-full text-sm focus:outline-none w-48 lg:w-64 transition-all duration-300 glass-input ${!isTransparent ? 'bg-slate-100 text-slate-800 placeholder-slate-400 focus:bg-white' : 'bg-white/10 text-white placeholder-white/70 focus:bg-white/20 border-white/30'
                    }`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${!isTransparent ? 'text-slate-400 group-hover:text-rose-500' : 'text-white/70'
                  }`}>
                  <FaSearch className="w-4 h-4" />
                </div>
              </div>
            </form>

            <div className="flex items-center space-x-2">
              <Link to="/wishlist" className={`relative p-2.5 rounded-full transition-all duration-300 group cursor-pointer ${iconClass}`} title="Wishlist">
                <FaHeart className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse shadow-lg">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <Link to="/cart" className={`relative p-2.5 rounded-full transition-all duration-300 group cursor-pointer ${iconClass}`} title="Cart">
                <FaShoppingCart className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse shadow-lg">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            </div>

            {loading || backendUserLoading ? (
              <div className="flex items-center space-x-1">
                <div className={`animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 ${!isTransparent ? 'border-rose-500' : 'border-white'}`}></div>
              </div>
            ) : isAuthenticated && user && user.uid ? (
              <div className="relative">
                <button
                  id="profile-button"
                  className="group flex items-center space-x-1 focus:outline-none"
                  onClick={toggleDropdown}
                >

                  <div className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center border-2 transition-all duration-300 ${!isTransparent ? 'border-rose-100 shadow-sm' : 'border-white/50'}`}>
                    {(() => {
                      if (backendUser?.image_url) {
                        return (
                          <img
                            src={backendUser.image_url}
                            alt={backendUser.name || user?.displayName || 'User'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentElement.classList.add('bg-slate-200');
                              // We'll let the parent div show the fallback icon if we hide the image
                              // But since we are inside the img tag, we need to handle this carefully
                              // Actually, simpler approach: switch to a reliable default avatar or just hide and show icon
                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
                            }}
                          />
                        );
                      } else if (user?.photoURL) {
                        return (
                          <img
                            src={user.photoURL}
                            alt={user?.displayName || 'User'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
                            }}
                          />
                        );
                      } else if (user?.displayName) {
                        return (
                          <div
                            className="w-full h-full flex items-center justify-center text-white font-medium text-sm"
                            style={{
                              backgroundColor: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
                            }}
                          >
                            {user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                          </div>
                        );
                      } else {
                        return (
                          <div className="w-full h-full flex items-center justify-center bg-slate-200">
                            <FaUser size={14} className="text-slate-400" />
                          </div>
                        );
                      }
                    })()}
                  </div>
                  <span className={`hidden lg:inline font-medium text-sm ml-2 ${!isTransparent ? 'text-slate-700' : 'text-white'}`}>
                    {user?.displayName?.split(' ')[0] ||
                      user?.name?.split(' ')[0] ||
                      (user?.email ? user.email.split('@')[0].split('.')[0] :
                        (user?.phoneNumber ? `+${user.phoneNumber.slice(-10)}` : 'Account'))}
                  </span>
                </button>

                {/* Dropdown Menu */}
                <div
                  className={`profile-dropdown absolute right-0 mt-3 w-56 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl py-2 z-50 transition-all duration-300 border border-white/50 ${isProfileDropdownOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
                    }`}
                >
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {user?.displayName || user?.name || 'User'}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {user?.email || user?.phoneNumber || 'No contact info'}
                    </p>
                  </div>
                  <div className="p-1">
                    <Link to="/profile" className="flex items-center px-3 py-2 text-sm text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors duration-200 cursor-pointer" onClick={() => setIsProfileDropdownOpen(false)}>
                      <FaUser className="w-4 h-4 mr-3 opacity-70" />
                      My Profile
                    </Link>
                    <Link to="/my-orders" className="flex items-center px-3 py-2 text-sm text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors duration-200 cursor-pointer" onClick={() => setIsProfileDropdownOpen(false)}>
                      <FaShoppingBag className="w-4 h-4 mr-3 opacity-70" />
                      My Orders
                    </Link>
                  </div>
                  <div className="border-t border-slate-100 my-1"></div>
                  <div className="p-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-colors duration-200 font-medium"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-2 text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 px-6 py-2.5 rounded-full transition-all duration-300 shadow-lg hover:shadow-rose-500/30 cursor-pointer transform hover:-translate-y-0.5"
              >
                <FaUser size={14} />
                <span className="text-sm font-bold">Login</span>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className={`xl:hidden transition-colors duration-300 ${!isTransparent ? 'text-slate-800' : 'text-white'}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="xl:hidden mt-4 pb-6 border-t border-white/10 animate-fade-in-up bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl absolute left-4 right-4 top-16">
            <form onSubmit={handleSearch} className="my-4 relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-rose-500"
              >
                <FaSearch />
              </button>
            </form>

            <nav className="flex flex-col space-y-1">
              <div
                className="px-3 py-3 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-xl cursor-pointer font-medium transition-colors flex items-center justify-between"
                onClick={() => setIsMobileCategoryOpen(!isMobileCategoryOpen)}
              >
                <span>Categories</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isMobileCategoryOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <div className={`overflow-hidden transition-all duration-300 ${isMobileCategoryOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                {megaMenuCategories.map((cat, index) => (
                  <Link
                    key={index}
                    to={cat.path}
                    className="px-3 py-2 text-slate-600 hover:text-rose-600 rounded-xl pl-8 cursor-pointer text-sm font-medium transition-colors flex items-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-3"></span>
                    {cat.name}
                  </Link>
                ))}
              </div>

              <div className="border-t border-slate-100 my-3"></div>

              {navItems.map((item) => (
                <Link key={item.name} to={item.path} className="px-3 py-3 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-xl cursor-pointer font-medium transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                  {item.name}
                </Link>
              ))}

              <div className="border-t border-slate-100 my-3"></div>

              {isAuthenticated && user ? (
                <>
                  <Link to="/profile" className="px-3 py-3 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-xl flex items-center cursor-pointer font-medium" onClick={() => setIsMobileMenuOpen(false)}>
                    <FaUser className="mr-3 opacity-70" /> Profile
                  </Link>
                  <Link to="/my-orders" className="px-3 py-3 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-xl flex items-center cursor-pointer font-medium" onClick={() => setIsMobileMenuOpen(false)}>
                    <FaShoppingBag className="mr-3 opacity-70" /> My Orders
                  </Link>
                  <Link to="/wishlist" className="px-3 py-3 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-xl flex items-center justify-between cursor-pointer font-medium" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="flex items-center"><FaHeart className="mr-3 opacity-70" /> Wishlist</div>
                    {wishlistCount > 0 && <span className="bg-rose-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{wishlistCount}</span>}
                  </Link>
                  <Link to="/cart" className="px-3 py-3 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-xl flex items-center justify-between cursor-pointer font-medium" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="flex items-center"><FaShoppingCart className="mr-3 opacity-70" /> Cart</div>
                    {cartItemCount > 0 && <span className="bg-rose-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{cartItemCount}</span>}
                  </Link>
                  <button onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }} className="w-full text-left px-3 py-3 text-rose-600 hover:bg-rose-50 rounded-xl font-medium mt-2">
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/login" className="px-3 py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl text-center font-bold hover:shadow-lg cursor-pointer mt-2 block" onClick={() => setIsMobileMenuOpen(false)}>
                  Login / Register
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
