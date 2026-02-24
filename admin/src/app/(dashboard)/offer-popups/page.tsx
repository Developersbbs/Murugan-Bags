'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaImage, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import Image from 'next/image';

interface Popup {
    _id: string;
    heading: string;
    description?: string;
    buttonText?: string;
    buttonLink?: string;
    isActive: boolean;
    priority?: number;
    startDate?: string;
    endDate?: string;
    image?: string;
}

interface FormState {
    heading: string;
    description: string;
    buttonText: string;
    buttonLink: string;
    isActive: boolean;
    priority: number;
    startDate: string;
    endDate: string;
}

export default function OfferPopupsPage() {
    const [popups, setPopups] = useState<Popup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPopup, setCurrentPopup] = useState<Popup | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    // Form state
    const [formData, setFormData] = useState<FormState>({
        heading: '',
        description: '',
        buttonText: 'Shop Now',
        buttonLink: '/products',
        isActive: true,
        priority: 0,
        startDate: '',
        endDate: ''
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const baseUrl = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

    // Helper: build a safe image URL regardless of whether the stored value
    // is already an absolute https:// URL (Firebase) or a relative backend path.
    const getImageUrl = (image: string | null | undefined): string | null => {
        if (!image) return null;
        if (image.startsWith('http://') || image.startsWith('https://')) return image;
        return `${API_URL}${image}`;
    };

    useEffect(() => {
        fetchPopups();
    }, []);

    const fetchPopups = async () => {
        try {
            const res = await fetch(`${baseUrl}/offer-popups/admin`);
            const data = await res.json();
            if (data.success) {
                setPopups(data.data);
            }
        } catch (error) {
            console.error('Error fetching popups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (name === 'priority' ? Number(value) : value)
        }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const resetForm = () => {
        setFormData({
            heading: '',
            description: '',
            buttonText: 'Shop Now',
            buttonLink: '/products',
            isActive: true,
            priority: 0,
            startDate: '',
            endDate: ''
        });
        setImageFile(null);
        setImagePreview(null);
        setIsEditing(false);
        setCurrentPopup(null);
    };

    const handleEdit = (popup: Popup) => {
        setCurrentPopup(popup);
        setFormData({
            heading: popup.heading,
            description: popup.description || '',
            buttonText: popup.buttonText || 'Shop Now',
            buttonLink: popup.buttonLink || '/products',
            isActive: popup.isActive,
            priority: popup.priority || 0,
            startDate: popup.startDate ? new Date(popup.startDate).toISOString().split('T')[0] : '',
            endDate: popup.endDate ? new Date(popup.endDate).toISOString().split('T')[0] : ''
        });
        setImagePreview(getImageUrl(popup.image));
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this offer popup?')) return;

        try {
            const res = await fetch(`${baseUrl}/offer-popups/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                fetchPopups();
                alert('Popup deleted successfully!');
            } else {
                alert('Failed to delete popup');
            }
        } catch (error) {
            console.error('Error deleting popup:', error);
        }
    };

    const handleToggle = async (id: string) => {
        try {
            const res = await fetch(`${baseUrl}/offer-popups/${id}/toggle`, {
                method: 'PATCH'
            });
            const data = await res.json();
            if (data.success) {
                fetchPopups();
            }
        } catch (error) {
            console.error('Error toggling popup:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!imageFile && !currentPopup) {
            alert('Please upload an image');
            return;
        }

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('heading', formData.heading);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('buttonText', formData.buttonText);
            formDataToSend.append('buttonLink', formData.buttonLink);
            formDataToSend.append('isActive', String(formData.isActive));
            formDataToSend.append('priority', String(formData.priority));
            if (formData.startDate) formDataToSend.append('startDate', formData.startDate);
            if (formData.endDate) formDataToSend.append('endDate', formData.endDate);
            if (imageFile) formDataToSend.append('image', imageFile);

            const url = isEditing && currentPopup
                ? `${baseUrl}/offer-popups/${currentPopup._id}`
                : `${baseUrl}/offer-popups`;

            const method = isEditing && currentPopup ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                body: formDataToSend
            });

            const result = await res.json();

            if (result.success) {
                fetchPopups();
                resetForm();
                alert('Offer popup saved successfully!');
            } else {
                alert(result.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Error saving popup:', error);
            alert(`Error saving popup: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Offer Popups Management</h1>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors"
                    >
                        <FaPlus /> Add New Popup
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-700">
                            {currentPopup ? 'Edit Offer Popup' : 'Add New Offer Popup'}
                        </h2>
                        <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                            <FaTimes size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Image Upload */}
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                            <input
                                type="file"
                                id="image"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                            <label htmlFor="image" className="cursor-pointer">
                                {imagePreview ? (
                                    <div className="relative w-full h-64">
                                        <Image
                                            src={imagePreview}
                                            alt="Preview"
                                            fill
                                            className="object-contain rounded-lg"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <FaImage className="w-16 h-16 text-slate-400 mb-4" />
                                        <p className="text-slate-600 font-medium">Click to upload offer image</p>
                                        <p className="text-sm text-slate-400 mt-2">PNG, JPG, GIF, WEBP up to 5MB</p>
                                    </div>
                                )}
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Heading *</label>
                                <input
                                    type="text"
                                    name="heading"
                                    value={formData.heading}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Button Text</label>
                                <input
                                    type="text"
                                    name="buttonText"
                                    value={formData.buttonText}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Button Link</label>
                                <input
                                    type="text"
                                    name="buttonLink"
                                    value={formData.buttonLink}
                                    onChange={handleInputChange}
                                    placeholder="/products"
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                                <input
                                    type="number"
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                                <p className="text-xs text-slate-500 mt-1">Higher priority shows first</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date (Optional)</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">End Date (Optional)</label>
                                <input
                                    type="date"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                />
                            </div>
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

                        <div className="flex justify-end gap-3">
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
                                <FaSave /> Save Popup
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {popups.map((popup) => (
                    <div key={popup._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="relative h-48 bg-slate-100">
                            {getImageUrl(popup.image) ? (
                                <Image
                                    src={getImageUrl(popup.image)!}
                                    alt={popup.heading}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">
                                    <FaImage className="w-12 h-12" />
                                </div>
                            )}
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-slate-800">{popup.heading}</h3>
                                <button
                                    onClick={() => handleToggle(popup._id)}
                                    className="text-2xl"
                                >
                                    {popup.isActive ? (
                                        <FaToggleOn className="text-green-500" />
                                    ) : (
                                        <FaToggleOff className="text-slate-400" />
                                    )}
                                </button>
                            </div>
                            <p className="text-sm text-slate-600 mb-3 line-clamp-2">{popup.description}</p>
                            <div className="flex justify-between items-center text-xs text-slate-500 mb-3">
                                <span>Priority: {popup.priority}</span>
                                <span className={`px-2 py-0.5 rounded-full ${popup.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {popup.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(popup)}
                                    className="flex-1 flex items-center justify-center gap-2 p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 hover:text-rose-600 transition-colors"
                                >
                                    <FaEdit size={14} /> Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(popup._id)}
                                    className="flex-1 flex items-center justify-center gap-2 p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 hover:text-red-600 transition-colors"
                                >
                                    <FaTrash size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {popups.length === 0 && !isEditing && (
                <div className="text-center py-12">
                    <FaImage className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">No offer popups yet</p>
                    <p className="text-slate-400 text-sm">Create your first popup to engage customers!</p>
                </div>
            )}
        </div>
    );
}
