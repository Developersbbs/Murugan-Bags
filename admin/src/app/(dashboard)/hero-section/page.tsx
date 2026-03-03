'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit, FaImage, FaSave, FaTimes, FaMobile } from 'react-icons/fa';
import Image from 'next/image';
import { uploadFile, deleteFile } from '@/lib/firebase/storage';

interface Slide {
    _id: string;
    title: string;
    subtitle: string;
    description: string;
    image: string;
    mobileImage?: string; // New field for mobile image
    gradient: string;
    ctaText: string;
    ctaLink: string;
    isActive: boolean;
    order: number;
}

export default function HeroSectionPage() {
    const [slides, setSlides] = useState<Slide[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(null);
    const [desktopImageFile, setDesktopImageFile] = useState<File | null>(null);
    const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
    const [desktopPreviewUrl, setDesktopPreviewUrl] = useState('');
    const [mobilePreviewUrl, setMobilePreviewUrl] = useState('');
    const [removeDesktopImage, setRemoveDesktopImage] = useState(false);
    const [removeMobileImage, setRemoveMobileImage] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        description: '',
        ctaText: 'Shop Now',
        ctaLink: '/products',
        gradient: 'from-black/90 via-black/40 to-transparent',
        isActive: true,
        useMobileImage: false // Flag to use mobile image
    });

    // Fix: Ensure API_URL always includes /api
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const API_URL = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

    // Helper to handle both external URLs (Firebase) and local paths
    const getImageUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http') || path.startsWith('https')) return path;
        return `${API_URL.replace('/api', '')}${path}`;
    };

    useEffect(() => {
        fetchSlides();
    }, []);

    const fetchSlides = async () => {
        try {
            const res = await fetch(`${API_URL}/hero-section/admin`);
            const data = await res.json();
            if (data.success) {
                setSlides(data.data);
            }
        } catch (error) {
            console.error('Error fetching slides:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleDesktopImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setDesktopImageFile(file);
            setDesktopPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleMobileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMobileImageFile(file);
            setMobilePreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleRemoveDesktopImage = async () => {
        if (!currentSlide?.image) return;

        if (confirm('Remove desktop image?')) {
            try {
                if (currentSlide.image.includes('firebase')) {
                    await deleteFile(currentSlide.image);
                }

                setDesktopImageFile(null);
                setDesktopPreviewUrl('');
                setRemoveDesktopImage(true);

            } catch (err) {
                console.error(err);
                alert('Failed to remove desktop image');
            }
        }
    };

    const handleRemoveMobileImage = async () => {
        if (!currentSlide?.mobileImage) return;

        if (confirm('Remove mobile image?')) {
            try {
                if (currentSlide.mobileImage.includes('firebase')) {
                    await deleteFile(currentSlide.mobileImage);
                }

                setMobileImageFile(null);
                setMobilePreviewUrl('');
                setRemoveMobileImage(true);

            } catch (err) {
                console.error(err);
                alert('Failed to remove mobile image');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            subtitle: '',
            description: '',
            ctaText: 'Shop Now',
            ctaLink: '/products',
            gradient: 'from-black/90 via-black/40 to-transparent',
            isActive: true,
            useMobileImage: false
        });
        setDesktopImageFile(null);
        setMobileImageFile(null);
        setDesktopPreviewUrl('');
        setMobilePreviewUrl('');
        setIsEditing(false);
        setCurrentSlide(null);
        setRemoveDesktopImage(false);
        setRemoveMobileImage(false);
    };

    const handleEdit = (slide: Slide) => {
        setCurrentSlide(slide as any);
        setFormData({
            title: slide.title,
            subtitle: slide.subtitle || '',
            description: slide.description || '',
            ctaText: slide.ctaText || 'Shop Now',
            ctaLink: slide.ctaLink || '/products',
            gradient: slide.gradient || 'from-black/90 via-black/40 to-transparent',
            isActive: slide.isActive,
            useMobileImage: !!slide.mobileImage
        });
        setDesktopPreviewUrl(getImageUrl(slide.image));
        if (slide.mobileImage) {
            setMobilePreviewUrl(getImageUrl(slide.mobileImage));
        }
        setIsEditing(true);
    };

    const handleDelete = async (slider: Slide) => {
        if (!confirm('Are you sure you want to delete this slide?')) return;

        try {
            // Delete images from Firebase if they exist
            const imageUrls = [slider.image];
            if (slider.mobileImage) imageUrls.push(slider.mobileImage);

            for (const imageUrl of imageUrls) {
                if (imageUrl && imageUrl.startsWith('https://firebasestorage')) {
                    try {
                        await deleteFile(imageUrl);
                    } catch (err) {
                        console.error('Error deleting image from Firebase:', err);
                        // Continue with DB deletion even if image deletion fails
                    }
                }
            }

            const res = await fetch(`${API_URL}/hero-section/${slider._id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                fetchSlides();
            } else {
                alert('Failed to delete slide');
            }
        } catch (error) {
            console.error('Error deleting slide:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            let desktopImageUrl = '';
            let mobileImageUrl = '';

            // Upload desktop image to Firebase if a new file is selected
            if (desktopImageFile) {
                console.log('Uploading desktop image to Firebase...');
                desktopImageUrl = await uploadFile(desktopImageFile, 'hero-section/desktop');
                console.log('Desktop image uploaded:', desktopImageUrl);
            }

            // Upload mobile image to Firebase if a new file is selected
            if (mobileImageFile) {
                console.log('Uploading mobile image to Firebase...');
                mobileImageUrl = await uploadFile(mobileImageFile, 'hero-section/mobile');
                console.log('Mobile image uploaded:', mobileImageUrl);
            }

            // Prepare data for backend
            const payload: any = {
                ...formData,
                image: removeDesktopImage
                    ? ''
                    : (desktopImageUrl || currentSlide?.image || ''),

                mobileImage: removeMobileImage
                    ? ''
                    : (mobileImageUrl || currentSlide?.mobileImage || '')
            };

            // Remove the useMobileImage flag from payload as it's not needed in backend
            delete payload.useMobileImage;

            const url = isEditing && currentSlide
                ? `${API_URL}/hero-section/${currentSlide._id}`
                : `${API_URL}/hero-section`;

            const method = isEditing && currentSlide ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            console.log('Response status:', res.status);

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Failed to save slide: ${res.status} ${res.statusText}`);
            }

            const result = await res.json();

            if (result.success) {
                fetchSlides();
                resetForm();
                alert('Slide saved successfully!');
            } else {
                alert(result.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Error saving slide:', error);
            alert(`Error saving slide: ${(error as Error).message}`);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Hero Section Management</h1>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors"
                    >
                        <FaPlus /> Add New Slide
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-700">
                            {currentSlide ? 'Edit Slide' : 'Add New Slide'}
                        </h2>
                        <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                            <FaTimes size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
                                    <input
                                        type="text"
                                        name="subtitle"
                                        value={formData.subtitle}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows="3"
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">CTA Text</label>
                                        <input
                                            type="text"
                                            name="ctaText"
                                            value={formData.ctaText}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">CTA Link</label>
                                        <input
                                            type="text"
                                            name="ctaLink"
                                            value={formData.ctaLink}
                                            onChange={handleInputChange}
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">

                                {/* ================= DESKTOP IMAGE ================= */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                        <FaImage className="text-rose-600" /> Desktop Background Image (16:9 recommended)
                                    </label>

                                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-rose-500 transition-colors">

                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleDesktopImageChange}
                                            className="hidden"
                                            id="desktop-image-upload"
                                        />

                                        <label htmlFor="desktop-image-upload" className="cursor-pointer flex flex-col items-center">

                                            {/* Preview */}
                                            {desktopPreviewUrl ? (
                                                <>
                                                    <div className="relative w-full h-48 mb-2">
                                                        <Image
                                                            src={desktopPreviewUrl}
                                                            alt="Desktop Preview"
                                                            fill
                                                            className="object-cover rounded-lg"
                                                        />
                                                    </div>

                                                    {/* REMOVE BUTTON */}
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveDesktopImage}
                                                        className="text-xs text-red-500 hover:text-red-700 mt-1"
                                                    >
                                                        Remove Desktop Image
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <FaImage className="w-12 h-12 text-slate-300 mb-2" />
                                                    {currentSlide?.image && (
                                                        <button
                                                            type="button"
                                                            onClick={handleRemoveDesktopImage}
                                                            className="text-xs text-red-500 hover:text-red-700 mt-1"
                                                        >
                                                            Remove Existing Desktop Image
                                                        </button>
                                                    )}
                                                </>
                                            )}

                                            <span className="text-sm text-slate-500 mt-2">
                                                Click to upload desktop image
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* ================= MOBILE IMAGE ================= */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                        <FaMobile className="text-rose-600" /> Mobile Background Image (9:16 recommended)
                                    </label>

                                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-rose-500 transition-colors">

                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleMobileImageChange}
                                            className="hidden"
                                            id="mobile-image-upload"
                                        />

                                        <label htmlFor="mobile-image-upload" className="cursor-pointer flex flex-col items-center">

                                            {/* Preview */}
                                            {mobilePreviewUrl ? (
                                                <>
                                                    <div className="relative w-full h-48 mb-2">
                                                        <Image
                                                            src={mobilePreviewUrl}
                                                            alt="Mobile Preview"
                                                            fill
                                                            className="object-cover rounded-lg"
                                                        />
                                                    </div>

                                                    {/* REMOVE BUTTON */}
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveMobileImage}
                                                        className="text-xs text-red-500 hover:text-red-700 mt-1"
                                                    >
                                                        Remove Mobile Image
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <FaMobile className="w-12 h-12 text-slate-300 mb-2" />
                                                    {currentSlide?.mobileImage && (
                                                        <button
                                                            type="button"
                                                            onClick={handleRemoveMobileImage}
                                                            className="text-xs text-red-500 hover:text-red-700 mt-1"
                                                        >
                                                            Remove Existing Mobile Image
                                                        </button>
                                                    )}
                                                </>
                                            )}

                                            <span className="text-sm text-slate-500 mt-2">
                                                Click to upload mobile image
                                            </span>
                                        </label>
                                    </div>

                                    <p className="text-xs text-slate-500 mt-1">
                                        For best results, use a 9:16 aspect ratio image (e.g., 1080x1920px)
                                    </p>
                                </div>

                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex items-center gap-2 bg-rose-600 text-white px-6 py-2 rounded-lg hover:bg-rose-700 transition-colors"
                            >
                                <FaSave /> Save Slide
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {slides.map((slide) => (
                    <div key={slide._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="relative h-48">
                            <Image
                                src={getImageUrl(slide.image)}
                                alt={slide.title}
                                fill
                                className="object-cover"
                            />
                            <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`}></div>

                            {/* Mobile image indicator */}
                            {slide.mobileImage && (
                                <div className="absolute top-2 left-2 bg-white/90 text-slate-700 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                                    <FaMobile size={10} />
                                    <span>Has mobile image</span>
                                </div>
                            )}

                            <div className="absolute bottom-4 left-4 right-4 text-white">
                                <h3 className="font-bold text-lg truncate">{slide.title}</h3>
                                <p className="text-sm opacity-90 truncate">{slide.subtitle}</p>
                            </div>
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEdit(slide)}
                                    className="p-2 bg-white/90 text-slate-700 rounded-full hover:bg-white hover:text-rose-600 transition-colors"
                                >
                                    <FaEdit size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(slide)}
                                    className="p-2 bg-white/90 text-slate-700 rounded-full hover:bg-white hover:text-red-600 transition-colors"
                                >
                                    <FaTrash size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-center text-sm text-slate-500 mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${slide.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {slide.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span>Order: {slide.order}</span>
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2">{slide.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}