import React from 'react';

const Skeleton = ({ className = '', variant = 'rect' }) => {
    const baseStyles = 'bg-slate-200 animate-pulse rounded';

    const variants = {
        rect: 'w-full h-full',
        circle: 'rounded-full',
        text: 'h-4 w-full mb-2',
        title: 'h-8 w-3/4 mb-4'
    };

    return (
        <div
            className={`${baseStyles} ${variants[variant] || variants.rect} ${className}`}
            aria-hidden="true"
        />
    );
};

export default Skeleton;
