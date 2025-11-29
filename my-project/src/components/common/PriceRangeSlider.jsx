import React, { useState, useRef, useEffect, useCallback } from 'react';

const PriceRangeSlider = ({
  min = 0,
  max = 10000,
  step = 100,
  value = [0, 10000],
  onChange,
  className = ''
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(null); // null, 'min', 'max'
  const sliderRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const getPercentage = useCallback((val) => {
    return ((val - min) / (max - min)) * 100;
  }, [min, max]);

  const getValueFromPosition = useCallback((clientX) => {
    if (!sliderRef.current) return 0;
    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const rawValue = min + (percentage / 100) * (max - min);
    return Math.round(rawValue / step) * step;
  }, [min, max, step]);

  const handleMouseDown = (handle, e) => {
    e.preventDefault();
    setIsDragging(handle);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const newValue = getValueFromPosition(e.clientX);
    setLocalValue(prev => {
      let newValues = [...prev];
      if (isDragging === 'min') {
        newValues[0] = Math.min(newValue, newValues[1] - step);
      } else if (isDragging === 'max') {
        newValues[1] = Math.max(newValue, newValues[0] + step);
      }
      return newValues;
    });
  }, [isDragging, getValueFromPosition, step]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      onChange?.(localValue);
      setIsDragging(null);
    }
  }, [isDragging, localValue, onChange]);

  const handleTouchStart = (handle, e) => {
    e.preventDefault();
    setIsDragging(handle);
  };

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();

    const touch = e.touches[0];
    const newValue = getValueFromPosition(touch.clientX);
    setLocalValue(prev => {
      let newValues = [...prev];
      if (isDragging === 'min') {
        newValues[0] = Math.min(newValue, newValues[1] - step);
      } else if (isDragging === 'max') {
        newValues[1] = Math.max(newValue, newValues[0] + step);
      }
      return newValues;
    });
  }, [isDragging, getValueFromPosition, step]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    if (isDragging) {
      onChange?.(localValue);
      setIsDragging(null);
    }
  }, [isDragging, localValue, onChange]);

  const handleTrackClick = (e) => {
    if (isDragging) return; // Don't handle track clicks while dragging

    const clickValue = getValueFromPosition(e.clientX);
    const distanceToMin = Math.abs(clickValue - localValue[0]);
    const distanceToMax = Math.abs(clickValue - localValue[1]);

    // Move the closer handle
    if (distanceToMin <= distanceToMax) {
      const newMin = Math.min(clickValue, localValue[1] - step);
      const newValue = [newMin, localValue[1]];
      setLocalValue(newValue);
      onChange?.(newValue);
    } else {
      const newMax = Math.max(clickValue, localValue[0] + step);
      const newValue = [localValue[0], newMax];
      setLocalValue(newValue);
      onChange?.(newValue);
    }
  };

  const handleInputChange = (index, inputValue) => {
    const numValue = parseInt(inputValue) || 0;
    const clampedValue = Math.max(min, Math.min(max, numValue));

    setLocalValue(prev => {
      const newValues = [...prev];
      newValues[index] = clampedValue;

      // Ensure min doesn't exceed max and vice versa
      if (index === 0 && clampedValue > newValues[1]) {
        newValues[1] = clampedValue;
      } else if (index === 1 && clampedValue < newValues[0]) {
        newValues[0] = clampedValue;
      }

      return newValues;
    });
  };

  const handleInputBlur = () => {
    onChange?.(localValue);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Price Inputs */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Min Price</label>
          <input
            type="number"
            value={localValue[0]}
            onChange={(e) => handleInputChange(0, e.target.value)}
            onBlur={handleInputBlur}
            min={min}
            max={max}
            step={step}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center justify-center pt-6">
          <span className="text-gray-400">-</span>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Max Price</label>
          <input
            type="number"
            value={localValue[1]}
            onChange={(e) => handleInputChange(1, e.target.value)}
            onBlur={handleInputBlur}
            min={min}
            max={max}
            step={step}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <div
          ref={sliderRef}
          className="relative h-2 bg-gray-200 rounded-lg cursor-pointer"
          onClick={handleTrackClick}
        >
          {/* Selected Range */}
          <div
            className="absolute h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg"
            style={{
              left: `${getPercentage(localValue[0])}%`,
              width: `${getPercentage(localValue[1]) - getPercentage(localValue[0])}%`,
            }}
          />

          {/* Min Handle */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 rounded-full cursor-grab shadow-lg transition-all duration-150 touch-none ${
              isDragging === 'min'
                ? 'border-blue-500 shadow-xl scale-110 cursor-grabbing'
                : 'border-gray-300 hover:border-blue-400 hover:shadow-xl'
            }`}
            style={{ left: `calc(${getPercentage(localValue[0])}% - 10px)` }}
            onMouseDown={(e) => handleMouseDown('min', e)}
            onTouchStart={(e) => handleTouchStart('min', e)}
          >
            <div className={`absolute inset-0 rounded-full transition-all duration-150 ${
              isDragging === 'min' ? 'bg-blue-100' : 'bg-gray-50 group-hover:bg-blue-50'
            }`} />
          </div>

          {/* Max Handle */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 rounded-full cursor-grab shadow-lg transition-all duration-150 touch-none ${
              isDragging === 'max'
                ? 'border-blue-500 shadow-xl scale-110 cursor-grabbing'
                : 'border-gray-300 hover:border-blue-400 hover:shadow-xl'
            }`}
            style={{ left: `calc(${getPercentage(localValue[1])}% - 10px)` }}
            onMouseDown={(e) => handleMouseDown('max', e)}
            onTouchStart={(e) => handleTouchStart('max', e)}
          >
            <div className={`absolute inset-0 rounded-full transition-all duration-150 ${
              isDragging === 'max' ? 'bg-blue-100' : 'bg-gray-50 group-hover:bg-blue-50'
            }`} />
          </div>
        </div>

        {/* Price Labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{formatCurrency(min)}</span>
          <span>{formatCurrency(max)}</span>
        </div>
      </div>

      {/* Current Range Display */}
      <div className="mt-3 text-center">
        <span className="text-sm font-medium text-gray-700">
          {formatCurrency(localValue[0])} - {formatCurrency(localValue[1])}
        </span>
      </div>
    </div>
  );
};

export default PriceRangeSlider;
