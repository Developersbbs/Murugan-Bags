import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { FaGoogle, FaPhone, FaEnvelope } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import {
  registerUser,
  loginUser,
  signInWithGoogle,
  clearError,
  setUser
} from '../../redux/slices/authSlice';
import { sendOTP, verifyOTP, checkPhoneNumber, cleanupRecaptcha } from '../../services/authService';

const AuthenticationForm = ({ isLogin = false }) => {
  const [authMethod, setAuthMethod] = useState('email'); // 'email', 'phone', 'google'
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    otp: ''
  });
  const [errors, setErrors] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(clearError());

    // Clean up reCAPTCHA when switching authentication methods
    if (authMethod !== 'phone') {
      cleanupRecaptcha();
      setOtpSent(false);
      setConfirmationResult(null);
      setCountdown(0);
    }
  }, [dispatch, authMethod]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupRecaptcha();
    };
  }, []);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const validateForm = () => {
    const newErrors = {};

    if (authMethod === 'email') {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }

      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (!isLogin) {
        if (!formData.firstName.trim()) {
          newErrors.firstName = 'First name is required';
        }

        if (!formData.confirmPassword) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
      }
    } else if (authMethod === 'phone') {
      if (!formData.phone) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^\d{10}$/.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid 10-digit phone number';
      }

      if (otpSent && !formData.otp) {
        newErrors.otp = 'OTP is required';
      }

      if (!isLogin && !otpSent && !formData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (isLogin) {
        await dispatch(loginUser({
          email: formData.email,
          password: formData.password
        })).unwrap();
        toast.success('Login successful!');
        navigate('/');
      } else {
        await dispatch(registerUser({
          email: formData.email,
          password: formData.password,
          displayName: `${formData.firstName} ${formData.lastName}`.trim()
        })).unwrap();
        toast.success('Account created successfully!');
        navigate('/');
      }
    } catch (error) {
      toast.error(error || 'Authentication failed');
    }
  };

  const handlePhoneAuth = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!otpSent) {
      // Send OTP
      try {
        const formattedPhone = formData.phone.startsWith('+') ? formData.phone : `+91${formData.phone}`;

        // Check if phone exists for login/signup validation
        const phoneExists = await checkPhoneNumber(formattedPhone);

        if (isLogin && !phoneExists) {
          toast.error('This phone number is not registered. Please sign up first.');
          return;
        }

        if (!isLogin && phoneExists) {
          toast.error('This phone number is already registered. Please sign in instead.');
          return;
        }

        // Clean up any existing reCAPTCHA before sending OTP
        cleanupRecaptcha();

        const result = await sendOTP(formattedPhone, 'recaptcha-container');

        if (result.success) {
          setConfirmationResult(result.confirmationResult);
          setOtpSent(true);
          setCountdown(60);
          toast.success('OTP sent successfully!');
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        toast.error(error.message || 'Failed to send OTP');
      }
    } else {
      // Verify OTP
      try {
        const userName = isLogin ? 'User' : `${formData.firstName} ${formData.lastName}`.trim() || 'User';
        const result = await verifyOTP(formData.otp, userName);

        if (result.user) {
          // Update Redux store with the user data
          dispatch(setUser(result.user));
          toast.success('Phone verification successful!');
          navigate('/');
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        toast.error(error.message || 'OTP verification failed');
      }
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await dispatch(signInWithGoogle()).unwrap();
      toast.success('Google sign-in successful!');
      navigate('/');
    } catch (error) {
      toast.error(error || 'Google sign-in failed');
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    try {
      // Clean up any existing reCAPTCHA before resending
      cleanupRecaptcha();

      const formattedPhone = formData.phone.startsWith('+') ? formData.phone : `+91${formData.phone}`;
      const result = await sendOTP(formattedPhone, 'recaptcha-container');

      if (result.success) {
        setConfirmationResult(result.confirmationResult);
        setCountdown(60);
        toast.success('OTP resent successfully!');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to resend OTP');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      otp: ''
    });
    setErrors({});
    setOtpSent(false);
    setCountdown(0);
    setConfirmationResult(null);
  };

  const switchAuthMethod = (method) => {
    setAuthMethod(method);
    resetForm();
    dispatch(clearError());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 backdrop-blur-sm">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Welcome Back!' : 'Join Murugan Bags'}
          </h2>
          <p className="text-gray-600 text-sm">
            {isLogin ? 'Sign in to access your account' : 'Create your account to get started'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Authentication Method Selector */}
        <div className="flex space-x-1 bg-gradient-to-r from-gray-50 to-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            type="button"
            onClick={() => switchAuthMethod('email')}
            className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${authMethod === 'email'
                ? 'bg-white text-blue-600 shadow-md transform scale-105 border border-blue-100'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
          >
            <FaEnvelope className="mr-2 text-xs" />
            Email
          </button>
          <button
            type="button"
            onClick={() => switchAuthMethod('phone')}
            className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${authMethod === 'phone'
                ? 'bg-white text-blue-600 shadow-md transform scale-105 border border-blue-100'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
          >
            <FaPhone className="mr-2 text-xs" />
            Phone
          </button>
        </div>

        {/* Email Authentication Form */}
        {authMethod === 'email' && (
          <form className="space-y-6" onSubmit={handleEmailAuth}>
            {!isLogin && (
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                    First name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      placeholder="Enter your first name"
                      className={`block w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${errors.firstName
                          ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                          : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 bg-gray-50 focus:bg-white'
                        } text-sm font-medium`}
                      value={formData.firstName}
                      onChange={handleInputChange}
                    />
                    {errors.firstName && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                      </div>
                    )}
                  </div>
                  {errors.firstName && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Last name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      placeholder="Enter your last name"
                      className="block w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 bg-gray-50 focus:bg-white text-sm font-medium transition-all duration-200"
                      value={formData.lastName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  name="email"
                  id="email"
                  placeholder="Enter your email address"
                  className={`block w-full pl-10 pr-12 py-3 rounded-xl border-2 transition-all duration-200 ${errors.email
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                      : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 bg-gray-50 focus:bg-white'
                    } text-sm font-medium`}
                  value={formData.email}
                  onChange={handleInputChange}
                />
                {errors.email && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="password"
                  placeholder="Enter your password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className={`block w-full pl-10 pr-12 py-3 rounded-xl border-2 transition-all duration-200 ${errors.password
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                      : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 bg-gray-50 focus:bg-white'
                    } text-sm font-medium`}
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors duration-200"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  {errors.password && (
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500 ml-2" />
                  )}
                </div>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.password}
                </p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    id="confirmPassword"
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className={`block w-full pl-10 pr-12 py-3 rounded-xl border-2 transition-all duration-200 ${errors.confirmPassword
                        ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                        : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 bg-gray-50 focus:bg-white'
                      } text-sm font-medium`}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors duration-200"
                    >
                      {showConfirmPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                    {errors.confirmPassword && (
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500 ml-2" />
                    )}
                  </div>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {isLogin ? 'Sign in' : 'Create account'}
                </>
              )}
            </button>
          </form>
        )}

        {/* Phone Authentication Form */}
        {authMethod === 'phone' && (
          <form className="space-y-6" onSubmit={handlePhoneAuth}>
            {!isLogin && !otpSent && (
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                    First name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      placeholder="Enter your first name"
                      className={`block w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 ${errors.firstName
                          ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                          : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 bg-gray-50 focus:bg-white'
                        } text-sm font-medium`}
                      value={formData.firstName}
                      onChange={handleInputChange}
                    />
                    {errors.firstName && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                      </div>
                    )}
                  </div>
                  {errors.firstName && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Last name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      placeholder="Enter your last name"
                      className="block w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 bg-gray-50 focus:bg-white text-sm font-medium transition-all duration-200"
                      value={formData.lastName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-gray-600 font-medium text-sm bg-gray-100 px-2 py-1 rounded">+91</span>
                  </div>
                </div>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  disabled={otpSent}
                  placeholder="Enter 10-digit mobile number"
                  className={`block w-full pl-20 pr-12 py-3 rounded-xl border-2 transition-all duration-200 ${errors.phone
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                      : otpSent
                        ? 'border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed'
                        : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 bg-gray-50 focus:bg-white'
                    } text-sm font-medium`}
                  value={formData.phone}
                  onChange={handleInputChange}
                />
                {errors.phone && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                  </div>
                )}
                {otpSent && !errors.phone && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {errors.phone && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.phone}
                </p>
              )}
            </div>

            {otpSent && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 mb-2">
                  Enter OTP <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="otp"
                    id="otp"
                    placeholder="Enter 6-digit OTP"
                    maxLength="6"
                    className={`block w-full pl-10 pr-12 py-3 rounded-xl border-2 transition-all duration-200 text-center text-lg font-bold tracking-widest ${errors.otp
                        ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                        : 'border-blue-200 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 bg-white focus:bg-white'
                      }`}
                    value={formData.otp}
                    onChange={handleInputChange}
                  />
                  {errors.otp && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.otp && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.otp}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-blue-600 font-medium">
                    📱 OTP sent to +91{formData.phone}
                  </p>
                  {countdown > 0 && (
                    <p className="text-sm text-gray-500">
                      ⏱️ {countdown}s
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {otpSent ? 'Verifying...' : 'Sending OTP...'}
                </>
              ) : (
                otpSent ? 'Verify OTP' : 'Send OTP'
              )}
            </button>

            {otpSent && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={countdown > 0 || loading}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                </button>
              </div>
            )}
          </form>
        )}

        {/* Google Authentication */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full flex items-center justify-center px-6 py-4 border-2 border-gray-200 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
        >
          <FaGoogle className="mr-3 text-red-500 text-lg" />
          {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
        </button>

        {/* Switch between login/register */}
        <div className="text-center mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          {isLogin ? (
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/register')}
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200 underline decoration-2 underline-offset-2"
              >
                Sign up here
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200 underline decoration-2 underline-offset-2"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

        {/* reCAPTCHA container */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default AuthenticationForm;
