import React from 'react';
import { FaGoogle } from 'react-icons/fa';
import { signInWithGoogle } from '../../services/authService';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const GoogleSignInButton = ({ buttonText = 'Continue with Google', onSuccess, onError }) => {
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      const { user, error } = await signInWithGoogle();
      
      if (error) {
        console.error('Google sign in error:', error);
        toast.error(error);
        onError?.(error);
        return;
      }

      if (user) {
        toast.success('Successfully signed in with Google');
        onSuccess?.(user);
        navigate('/'); // Redirect to home or dashboard after successful login
      }
    } catch (error) {
      console.error('Error during Google sign in:', error);
      toast.error('Failed to sign in with Google');
      onError?.(error);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      type="button"
      className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <FaGoogle className="w-5 h-5 mr-2 text-red-600" />
      {buttonText}
    </button>
  );
};

export default GoogleSignInButton;
