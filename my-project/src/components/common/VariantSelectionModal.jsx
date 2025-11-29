import React, { useState, useEffect } from 'react';

const VariantSelectionModal = ({ product, isOpen, onClose, onAddToCart, quantity = 1 }) => {
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);

  // Reset state when modal opens with new product
  useEffect(() => {
    if (isOpen && product?.product_variants?.length > 0) {
      // Set default variant (first one)
      const defaultVariant = product.product_variants[0];
      setSelectedVariant(defaultVariant);

      // Initialize selected attributes
      if (defaultVariant.attributes) {
        if (defaultVariant.attributes instanceof Map) {
          const attrs = {};
          defaultVariant.attributes.forEach((value, key) => {
            attrs[key] = value;
          });
          setSelectedAttributes(attrs);
        } else {
          setSelectedAttributes({ ...defaultVariant.attributes });
        }
      }
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  // Helper function to safely get attribute value
  const getAttributeValue = (attributes, key) => {
    if (!attributes) return null;
    if (attributes instanceof Map) {
      return attributes.get(key);
    }
    return attributes[key];
  };

  // Get available options for a specific attribute
  const getAttributeOptions = (attributeName) => {
    if (!product?.product_variants) return [];

    const options = new Set();
    product.product_variants.forEach(variant => {
      const value = getAttributeValue(variant.attributes, attributeName);
      if (value) {
        options.add(value);
      }
    });
    return Array.from(options);
  };

  // Handle attribute selection
  const handleAttributeChange = (attribute, value) => {
    const newAttributes = {
      ...selectedAttributes,
      [attribute]: value
    };
    setSelectedAttributes(newAttributes);

    // Find matching variant
    if (product?.product_variants) {
      const matchingVariant = product.product_variants.find(variant => {
        if (!variant.attributes) return false;

        return Object.entries(newAttributes).every(([key, val]) => {
          const attrValue = getAttributeValue(variant.attributes, key);
          return attrValue === val;
        });
      });

      if (matchingVariant) {
        setSelectedVariant(matchingVariant);
      }
    }
  };

  // Get all unique attribute names
  const getAttributeNames = () => {
    if (!product?.product_variants) return [];

    const attributeNames = new Set();
    product.product_variants.forEach(variant => {
      if (!variant.attributes) return;
      if (variant.attributes instanceof Map) {
        variant.attributes.forEach((_, key) => attributeNames.add(key));
      } else if (typeof variant.attributes === 'object') {
        Object.keys(variant.attributes).forEach(key => attributeNames.add(key));
      }
    });
    return Array.from(attributeNames);
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (selectedVariant) {
      onAddToCart(product, selectedVariant, quantity);
      onClose();
    }
  };

  // Get display price for selected variant
  const getDisplayPrice = () => {
    if (selectedVariant?.selling_price) {
      return selectedVariant.selling_price;
    }
    return product.selling_price || product.price || 0;
  };

  // Get display stock for selected variant
  const getDisplayStock = () => {
    if (selectedVariant?.stock !== undefined) {
      return selectedVariant.stock;
    }
    return product.stockQuantity || product.baseStock || 0;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                Select Options for {product.name}
              </h3>

              {/* Variant Selection */}
              <div className="space-y-6">
                {getAttributeNames().map(attributeName => (
                  <div key={attributeName}>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">{attributeName}</h4>
                    <fieldset>
                      <legend className="sr-only">Choose a {attributeName}</legend>
                      <div className="grid grid-cols-3 gap-3">
                        {getAttributeOptions(attributeName).map(option => (
                          <label key={option} className="relative">
                            <input
                              type="radio"
                              name={attributeName}
                              value={option}
                              checked={selectedAttributes[attributeName] === option}
                              onChange={() => handleAttributeChange(attributeName, option)}
                              className="sr-only"
                            />
                            <div className={`cursor-pointer rounded-md border py-3 px-4 flex items-center justify-center text-sm font-medium text-center sm:flex-1 ${
                              selectedAttributes[attributeName] === option
                                ? 'bg-indigo-600 border-transparent text-white hover:bg-indigo-700'
                                : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
                            }`}>
                              {option}
                            </div>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                ))}

                {/* Selected Variant Info */}
                {selectedVariant && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Option:</h4>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">
                          {selectedVariant.name || 'Variant'}
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          ₹{getDisplayPrice().toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getDisplayStock() > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {getDisplayStock() > 0 ? 'In Stock' : 'Out of Stock'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex space-x-3">
                <button
                  type="button"
                  className="flex-1 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    selectedVariant && getDisplayStock() > 0
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                  onClick={handleAddToCart}
                  disabled={!selectedVariant || getDisplayStock() <= 0}
                >
                  {selectedVariant && getDisplayStock() > 0
                    ? `Add to Cart (₹${getDisplayPrice().toFixed(2)})`
                    : 'Unavailable'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariantSelectionModal;
