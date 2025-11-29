import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearError } from '../../redux/slices/authSlice';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

const AuthForm = ({
  isLogin = false,
  onSubmit,
  loading = false,
  error = '',
  onSwitchMode,
  formData: parentFormData = {},
  onInputChange: parentOnInputChange,
}) => {
  // Define default form data structure with all possible fields
  const defaultFormData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  };
  
  // Initialize local form state with default values
  const [localFormData, setLocalFormData] = useState({
    ...defaultFormData,
    ...(parentFormData || {}) // Merge with any initial parent data
  });
  
  // Use parent's form data if provided and has keys, otherwise use local state
  const isControlled = parentFormData && Object.keys(parentFormData).length > 0;
  const formData = isControlled ? { ...defaultFormData, ...parentFormData } : localFormData;
  const [errors, setErrors] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { otpSent: otpSentFromState } = useSelector((state) => state.auth);

  useEffect(() => {
    // Clear any previous errors when component mounts
    dispatch(clearError());
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  useEffect(() => {
    setOtpSent(otpSentFromState || false);
  }, [otpSentFromState]);

  const validate = () => {
    const newErrors = {};
    
    if (!isLogin) {
      // First name validation
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      
      // Email validation
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      
      // Password validation
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      
      // Confirm password validation
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
        // Also show error on password field for better UX
        if (!newErrors.password) {
          newErrors.password = 'Passwords do not match';
        }
      }
    } else {
      // Login validation
      if (!formData.email) newErrors.email = 'Email is required';
      if (!formData.password) newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isValid = validate();
    if (isValid) {
      // Only include necessary fields in the form data
      const { confirmPassword, ...submitData } = formData;
      
      // Reset form data after successful submission for login
      if (isLogin) {
        setLocalFormData(defaultFormData);
      }
      onSubmit(submitData);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedValue = value === undefined ? '' : value;
    
    // Create a synthetic event with the updated value
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        name,
        value: updatedValue
      }
    };
    
    // Update the form data first
    const updateFormData = (prev) => {
      const newData = {
        ...prev,
        [name]: updatedValue
      };
      
      // If this is a password field update, ensure we don't have stale confirm password errors
      if (name === 'password' || name === 'confirmPassword') {
        // If passwords match, clear any existing errors
        if (name === 'password' && prev.confirmPassword === updatedValue) {
          setErrors(prevErrors => ({
            ...prevErrors,
            password: '',
            confirmPassword: ''
          }));
        } else if (name === 'confirmPassword' && prev.password === updatedValue) {
          setErrors(prevErrors => ({
            ...prevErrors,
            password: '',
            confirmPassword: ''
          }));
        }
      }
      
      return newData;
    };
    
    // If parent provides onInputChange, use it, otherwise update local state
    if (parentOnInputChange) {
      parentOnInputChange(syntheticEvent);
    } else {
      setLocalFormData(updateFormData);
    }
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const toggleAuthMode = () => {
    setShowPhoneForm(!showPhoneForm);
    setOtpSent(false);
    setPhone('');
    setOtp('');
    dispatch(clearError());
  };

  const handlePhoneChange = (e) => {
    setPhone(e.target.value);
  };

  const handleOtpChange = (e) => {
    setOtp(e.target.value);
  };

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (!phone) {
      setErrors({ ...errors, phone: 'Phone number is required' });
      return;
    }
    
    if (otpSent) {
      if (!otp) {
        setErrors({ ...errors, otp: 'Please enter the OTP' });
        return;
      }
      // Verify OTP
      if (onPhoneSubmit) {
        onPhoneSubmit(otp);
      }
    } else {
      // Send OTP
      if (onPhoneSubmit) {
        onPhoneSubmit(phone);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </h2>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First name <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    name="firstName"
                    id="firstName"
                    autoComplete="given-name"
                    className={`block w-full rounded-md ${errors.firstName ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500' : 'border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500'} sm:text-sm`}
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                  {errors.firstName && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                    </div>
                  )}
                </div>
                {errors.firstName && (
                  <p className="mt-2 text-sm text-red-600" id="firstname-error">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last name
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    name="lastName"
                    id="lastName"
                    autoComplete="family-name"
                    className={`block w-full rounded-md ${
                      errors.lastName ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500' : 'border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500'
                    } sm:text-sm`}
                    value={formData.lastName || ''}
                    onChange={handleChange}
                  />
                  {errors.lastName && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                    </div>
                  )}
                </div>
                {errors.lastName && (
                  <p className="mt-2 text-sm text-red-600" id="lastname-error">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className={`block w-full rounded-md ${errors.email ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500' : 'border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500'} sm:text-sm`}
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                </div>
              )}
            </div>
            {errors.email && (
              <p className="mt-2 text-sm text-red-600" id="email-error">
                {errors.email}
              </p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone number
              </label>
              <div className="mt-1">
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  autoComplete="tel"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password{!isLogin && ' *'}
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className={`block w-full rounded-md ${errors.password ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500' : 'border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500'} sm:text-sm`}
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                </div>
              )}
            </div>
            {errors.password && (
              <p className="mt-2 text-sm text-red-600" id="password-error">
                {errors.password}
              </p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm password <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className={`block w-full rounded-md ${errors.confirmPassword ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500' : 'border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500'} sm:text-sm`}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                {errors.confirmPassword && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                  </div>
                )}
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600" id="confirm-password-error">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          )}

          <div>
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
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : isLogin ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </button>
          </div>

          {!showPhoneForm && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
          )}

          {!showPhoneForm ? (
            <div>
              <button
                type="button"
                onClick={toggleAuthMode}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isLogin ? 'Sign in with Phone' : 'Sign up with Phone'}
              </button>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">{otpSent ? 'Verify OTP' : 'Phone Number'}</h3>
                <button
                  type="button"
                  onClick={toggleAuthMode}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Back to {isLogin ? 'Sign In' : 'Sign Up'}
                </button>
              </div>
              
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                {!otpSent ? (
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="tel"
                        id="phoneNumber"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="+1234567890"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                      Enter OTP <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="text"
                        id="otp"
                        value={otp}
                        onChange={handleOtpChange}
                        placeholder="Enter 6-digit OTP"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    {errors.otp && (
                      <p className="mt-2 text-sm text-red-600">{errors.otp}</p>
                    )}
                  </div>
                )}
                
                <div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {otpSent ? 'Verify OTP' : 'Send OTP'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </form>

        <div className="text-sm text-center mt-4">
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/register')}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default AuthForm;
