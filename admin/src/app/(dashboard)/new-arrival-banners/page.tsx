'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit, FaImage, FaSave, FaTimes } from 'react-icons/fa';
import Image from 'next/image';

export default function NewArrivalBannersPage() {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentBanner, setCurrentBanner] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        description: '',
        ctaText: 'Shop Now',
        ctaLink: '/products',
        gradient: 'from-black/90 via-black/40 to-transparent',
        isActive: true
    });

    // API_URL always includes /api
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const API_URL = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            const res = await fetch(`${API_URL}/new-arrival-banners/admin`);
            const data = await res.json();
            if (data.success) {
                setBanners(data.data);
            }
        } catch (error) {
            console.error('Error fetching banners:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
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
            isActive: true
        });
        setImageFile(null);
        setPreviewUrl('');
        setIsEditing(false);
        setCurrentBanner(null);
    };

    const handleEdit = (banner) => {
        setCurrentBanner(banner);
        setFormData({
            title: banner.title,
            subtitle: banner.subtitle || '',
            description: banner.description || '',
            ctaText: banner.ctaText || 'Shop Now',
            ctaLink: banner.ctaLink || '/new-arrivals',
            gradient: banner.gradient || 'from-black/90 via-black/40 to-transparent',
            isActive: banner.isActive
        });
        setPreviewUrl(`${API_URL.replace('/api', '')}${banner.image}`);
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this banner?')) return;

        try {
            const res = await fetch(`${API_URL}/new-arrival-banners/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                fetchBanners();
            } else {
                alert('Failed to delete banner');
            }
        } catch (error) {
            console.error('Error deleting banner:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            data.append(key, formData[key]);
        });

        if (imageFile) {
            data.append('image', imageFile);
        }

        try {
            const url = isEditing && currentBanner
                ? `${API_URL}/new-arrival-banners/${currentBanner._id}`
                : `${API_URL}/new-arrival-banners`;

            const method = isEditing && currentBanner ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                body: data
            });

            if (!res.ok) {
                const errorText = await res.text();
                alert(`Failed to save banner: ${res.status} ${res.statusText}`);
                return;
            }

            const result = await res.json();

            if (result.success) {
                fetchBanners();
                resetForm();
                alert('Banner saved successfully!');
            } else {
                alert(result.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Error saving banner:', error);
            alert(`Error saving banner: ${error.message}`);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800">New Arrival Banners</h1>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors"
                    >
                        <FaPlus /> Add New Banner
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-700">
                            {currentBanner ? 'Edit Banner' : 'Add New Banner'}
                        </h2>
                        <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                            <FaTimes size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Background Image</label>
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-rose-500 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                        id="banner-image-upload"
                                    />
                                    <label htmlFor="banner-image-upload" className="cursor-pointer flex flex-col items-center">
                                        {previewUrl ? (
                                            <div className="relative w-full h-48 mb-2">
                                                <Image
                                                    src={previewUrl}
                                                    alt="Preview"
                                                    fill
                                                    className="object-cover rounded-lg"
                                                />
                                            </div>
                                        ) : (
                                            <FaImage className="w-12 h-12 text-slate-300 mb-2" />
                                        )}
                                        <span className="text-sm text-slate-500">Click to upload image</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Gradient Overlay</label>
                                <select
                                    name="gradient"
                                    value={formData.gradient}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                >
                                    <option value="from-black/90 via-black/40 to-transparent">Black Fade</option>
                                    <option value="from-slate-900/90 via-slate-900/40 to-transparent">Slate Fade</option>
                                    <option value="from-rose-900/90 via-rose-900/40 to-transparent">Rose Fade</option>
                                    <option value="from-blue-900/90 via-blue-900/40 to-transparent">Blue Fade</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleInputChange}
                                    id="isActive"
                                    className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active</label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
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
                                    <FaSave /> Save Banner
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banners.map((banner) => (
                    <div key={banner._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="relative h-48">
                            <Image
                                src={`${API_URL.replace('/api', '')}${banner.image}`}
                                alt={banner.title}
                                fill
                                className="object-cover"
                            />
                            <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient}`}></div>
                            <div className="absolute bottom-4 left-4 right-4 text-white">
                                <h3 className="font-bold text-lg truncate">{banner.title}</h3>
                                <p className="text-sm opacity-90 truncate">{banner.subtitle}</p>
                            </div>
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEdit(banner)}
                                    className="p-2 bg-white/90 text-slate-700 rounded-full hover:bg-white hover:text-rose-600 transition-colors"
                                >
                                    <FaEdit size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(banner._id)}
                                    className="p-2 bg-white/90 text-slate-700 rounded-full hover:bg-white hover:text-red-600 transition-colors"
                                >
                                    <FaTrash size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-center text-sm text-slate-500 mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${banner.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {banner.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span>Order: {banner.order}</span>
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2">{banner.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
