import React, { useState, useEffect } from 'react';
import LoginPromptModal from './LoginPromptModal';

const GlobalLoginPromptHandler = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    feature: 'cart',
    action: 'add',
    message: ''
  });

  useEffect(() => {
    const handleLoginPrompt = (event) => {
      const { feature, action, message } = event.detail;
      
      setModalState({
        isOpen: true,
        feature,
        action,
        message
      });
    };

    // Listen for custom login prompt events
    window.addEventListener('show-login-prompt', handleLoginPrompt);

    return () => {
      window.removeEventListener('show-login-prompt', handleLoginPrompt);
    };
  }, []);

  const handleCloseModal = () => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  const getModalTitle = () => {
    const { feature, action } = modalState;
    
    if (feature === 'cart') {
      switch (action) {
        case 'add':
          return 'Sign in to add to cart';
        case 'remove':
          return 'Sign in to manage cart';
        case 'update':
          return 'Sign in to update cart';
        default:
          return 'Sign in to access cart';
      }
    } else if (feature === 'wishlist') {
      switch (action) {
        case 'add':
          return 'Sign in to save to wishlist';
        case 'remove':
          return 'Sign in to manage wishlist';
        default:
          return 'Sign in to access wishlist';
      }
    }
    
    return 'Sign in to continue';
  };

  return (
    <LoginPromptModal
      isOpen={modalState.isOpen}
      onClose={handleCloseModal}
      title={getModalTitle()}
      message={modalState.message}
      feature={modalState.feature}
      showBenefits={true}
    />
  );
};

export default GlobalLoginPromptHandler;
