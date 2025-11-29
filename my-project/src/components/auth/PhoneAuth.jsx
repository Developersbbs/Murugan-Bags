import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { sendPhoneOTP, verifyPhoneOTP, clearError, checkPhoneNumberExists } from '../../redux/slices/authSlice';
import { sendOTP, verifyOTP, checkPhoneNumber } from '../../services/authService';
import { toast } from 'react-hot-toast';

const PhoneAuth = ({ isLogin = true, onSuccess }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [isCheckingNumber, setIsCheckingNumber] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const dispatch = useDispatch();
  const { loading, error, otpSent, phoneNumberExists } = useSelector((state) => state.auth);

  useEffect(() => {
    // Cleanup function
    return () => {
      // Clean up reCAPTCHA
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (error) {
          console.log('Error clearing reCAPTCHA:', error);
        }
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  useEffect(() => {
    // Countdown timer for resend OTP
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handlePhoneChange = (e) => {
    setPhone(e.target.value);
    if (error) dispatch(clearError());
  };

  const handleOtpChange = (e) => {
    setOtp(e.target.value);
  };

  const formatPhoneNumber = (phone) => {
    // Ensure phone number starts with + and country code
    if (!phone.startsWith('+')) {
      return `+91${phone}`; // Default to India (+91) if no country code
    }
    return phone;
  };

  const checkIfPhoneNumberExists = async (phoneNumber) => {
    try {
      const exists = await checkPhoneNumber(phoneNumber);
      return exists;
    } catch (error) {
      console.error('Error checking phone number:', error);
      return false;
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phone) {
      toast.error('Phone number is required');
      return;
    }

    try {
      setIsCheckingNumber(true);
      const formattedPhone = formatPhoneNumber(phone);
      
      // Check if phone number exists in the system
      const phoneExists = await checkIfPhoneNumberExists(formattedPhone);
      
      // If it's a login attempt and phone doesn't exist, show error
      if (isLogin && !phoneExists) {
        toast.error('This phone number is not registered. Please sign up first.');
        setIsCheckingNumber(false);
        return;
      }
      
      // If it's a signup attempt and phone already exists, show error
      if (!isLogin && phoneExists) {
        toast.error('This phone number is already registered. Please sign in instead.');
        setIsCheckingNumber(false);
        return;
      }

      console.log('Sending OTP to:', formattedPhone);
      
      // Use the service function to send OTP
      const result = await sendOTP(formattedPhone, 'recaptcha-container');
      
      if (result.success) {
        console.log('OTP sent successfully');
        setConfirmationResult(result.confirmationResult);
        setCountdown(60); // 60 seconds countdown
        toast.success('OTP sent successfully!');
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Error in OTP flow:', error);
      toast.error(error.message || 'Failed to send OTP. Please try again.');
      dispatch(clearError());
    } finally {
      setIsCheckingNumber(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp) {
      toast.error('Please enter the OTP');
      return;
    }
    if (!confirmationResult && !window.confirmationResult) {
      toast.error('OTP session expired. Please request a new OTP.');
      return;
    }

    try {
      console.log('Verifying OTP...');
      
      // Use the service function to verify OTP
      const result = await verifyOTP(otp, 'User'); // Default name for phone auth
      
      if (result.user) {
        console.log('OTP verified successfully:', result.user);
        toast.success('Phone number verified successfully!');
        
        // Call onSuccess callback with user data
        if (onSuccess) {
          onSuccess(result.user);
        }
        
        // Clean up
        setConfirmationResult(null);
        setOtp('');
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'Failed to verify OTP. Please try again.');
      
      if (error.message.includes('expired')) {
        setConfirmationResult(null);
      }
      
      dispatch(clearError());
    }
  };

  const handleResendOTP = async (e) => {
    e.preventDefault();
    if (countdown > 0) return;
    
    await handleSendOTP(e);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {isLogin ? 'Sign in with Phone' : 'Sign up with Phone'}
        </h2>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      {!confirmationResult ? (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">+91</span>
              </div>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="Enter 10-digit mobile number"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-12 sm:text-sm border-gray-300 rounded-md"
                required
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
              Enter OTP <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={handleOtpChange}
                placeholder="Enter 6-digit OTP"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              OTP sent to +91{phone}
            </p>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
          
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
        </form>
      )}
      
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default PhoneAuth;
