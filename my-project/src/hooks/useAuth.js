import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  loginUser, 
  registerUser, 
  sendPhoneOTP, 
  verifyPhoneOTP, 
  userLogout,
  clearError,
  resetOtpState
} from '../redux/slices/authSlice';

const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { 
    user, 
    isAuthenticated, 
    loading, 
    error, 
    otpSent, 
    verificationId 
  } = useSelector((state) => state.auth);

  // Email/Password Authentication
  const login = (email, password) => {
    dispatch(loginUser({ email, password }));
  };

  const register = (email, password) => {
    dispatch(registerUser({ email, password }));
  };

  // Phone Authentication
  const sendOtp = (phoneNumber) => {
    dispatch(sendPhoneOTP(phoneNumber));
  };

  const verifyOtp = (otp) => {
    dispatch(verifyPhoneOTP(otp));
  };

  // Logout
  const logout = () => {
    dispatch(userLogout())
      .then(() => {
        navigate('/login');
      });
  };

  // Clear errors
  const clearAuthError = () => {
    dispatch(clearError());
  };

  // Reset OTP state
  const resetOtp = () => {
    dispatch(resetOtpState());
  };

  return {
    // State
    user,
    isAuthenticated,
    loading,
    error,
    otpSent,
    verificationId,
    
    // Actions
    login,
    register,
    sendOtp,
    verifyOtp,
    logout,
    clearAuthError,
    resetOtp,
  };
};

export default useAuth;
