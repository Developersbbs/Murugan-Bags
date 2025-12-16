'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaTag, FaPercent } from 'react-icons/fa';
import { ImageDropzone } from '@/components/shared/ImageDropzone';
import { storage } from '@/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ComboOffer {
    _id: string;
    title: string;
    description: string;
    image?: string;
    price: number;
    originalPrice: number;
    isLimitedTime: boolean;
    order: number;
    isActive: boolean;
    isHomeFeatured: boolean;
    savingsPercent?: number;
}

export default function ComboOffersPage() {
    const [offers, setOffers] = useState<ComboOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentOffer, setCurrentOffer] = useState<ComboOffer | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        image: '',
        price: '',
        originalPrice: '',
        isLimitedTime: true,
        order: '',
        isActive: true,
        isHomeFeatured: false
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const baseUrl = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        try {
            const res = await fetch(`${baseUrl}/combo-offers/admin`);
            const data = await res.json();
            if (data.success) {
                setOffers(data.data);
            }
        } catch (error) {
            console.error('Error fetching offers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            image: '',
            price: '',
            originalPrice: '',
            isLimitedTime: true,
            order: '',
            isActive: true,
            isHomeFeatured: false
        });
        setIsEditing(false);
        setCurrentOffer(null);
        setSelectedFile(null);
    };

    const handleEdit = (offer: ComboOffer) => {
        setCurrentOffer(offer);
        setFormData({
            title: offer.title,
            description: offer.description || '',
            image: offer.image || '',
            price: offer.price.toString(),
            originalPrice: offer.originalPrice.toString(),
            isLimitedTime: offer.isLimitedTime,
            order: (offer.order || 0).toString(),
            isActive: offer.isActive,
            isHomeFeatured: offer.isHomeFeatured || false
        });
        setIsEditing(true);
        setSelectedFile(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this combo offer?')) return;

        try {
            const res = await fetch(`${baseUrl}/combo-offers/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                fetchOffers();
            } else {
                alert('Failed to delete offer');
            }
        } catch (error) {
            console.error('Error deleting offer:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            let imageUrl = formData.image;

            if (selectedFile) {
                setUploading(true);
                const storageRef = ref(storage, `combo-offers/${Date.now()}_${selectedFile.name}`);
                await uploadBytes(storageRef, selectedFile);
                imageUrl = await getDownloadURL(storageRef);
                setUploading(false);
            }

            const url = isEditing && currentOffer
                ? `${baseUrl}/combo-offers/${currentOffer._id}`
                : `${baseUrl}/combo-offers`;

            const method = isEditing && currentOffer ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    image: imageUrl,
                    price: parseFloat(formData.price),
                    originalPrice: parseFloat(formData.originalPrice),
                    order: parseInt(formData.order.toString() || '0')
                })
            });

            const result = await res.json();

            if (result.success) {
                fetchOffers();
                resetForm();
                alert('Combo offer saved successfully!');
            } else {
                alert(result.error || 'Operation failed');
            }
        } catch (error: any) {
            console.error('Error saving offer:', error);
            alert(`Error saving offer: ${error.message}`);
        }
    };

    const calculateSavings = () => {
        const price = parseFloat(formData.price.toString());
        const originalPrice = parseFloat(formData.originalPrice.toString());
        if (originalPrice > 0 && price < originalPrice) {
            return Math.round(((originalPrice - price) / originalPrice) * 100);
        }
        return 0;
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Combo Offers Management</h1>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors"
                    >
                        <FaPlus /> Add New Combo
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-700">
                            {currentOffer ? 'Edit Combo Offer' : 'Add New Combo Offer'}
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
                                        placeholder="e.g., Couple Travel Pack"
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="e.g., 2 Premium Backpacks + 1 Duffle Bag"
                                        rows="3"
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Image (Optional)</label>
                                    <ImageDropzone
                                        previewImage={formData.image}
                                        onFileAccepted={(file) => setSelectedFile(file)}
                                        onFileRemoved={() => {
                                            setSelectedFile(null);
                                            setFormData(prev => ({ ...prev, image: '' }));
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Original Price (₹)</label>
                                        <input
                                            type="number"
                                            name="originalPrice"
                                            value={formData.originalPrice}
                                            onChange={handleInputChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Offer Price (₹)</label>
                                        <input
                                            type="number"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleInputChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                </div>

                                {formData.price && formData.originalPrice && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                                        <FaPercent className="text-emerald-600" />
                                        <span className="text-emerald-700 font-semibold">
                                            Savings: {calculateSavings()}%
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Display Order</label>
                                    <input
                                        type="number"
                                        name="order"
                                        value={formData.order}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="isLimitedTime"
                                        checked={formData.isLimitedTime}
                                        onChange={handleInputChange}
                                        id="isLimitedTime"
                                        className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                                    />
                                    <label htmlFor="isLimitedTime" className="text-sm font-medium text-slate-700">
                                        Show "LIMITED TIME" Badge
                                    </label>
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

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="isHomeFeatured"
                                        checked={formData.isHomeFeatured}
                                        onChange={handleInputChange}
                                        id="isHomeFeatured"
                                        className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                                    />
                                    <label htmlFor="isHomeFeatured" className="text-sm font-medium text-slate-700">
                                        Show on Home Page
                                    </label>
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
                                        disabled={uploading}
                                        className="flex items-center gap-2 bg-rose-600 text-white px-6 py-2 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
                                    >
                                        {uploading ? 'Uploading...' : <><FaSave /> Save Combo</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {offers.map((offer) => (
                    <div key={offer._id} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 group hover:border-rose-500/50 transition-all relative">
                        {offer.isLimitedTime && (
                            <div className="absolute top-0 right-0 bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                LIMITED TIME
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-4 mt-2">
                            <h3 className="text-2xl font-bold text-white">{offer.title}</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(offer)}
                                    className="p-2 bg-slate-700 text-white rounded-full hover:bg-rose-600 transition-colors"
                                >
                                    <FaEdit size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(offer._id)}
                                    className="p-2 bg-slate-700 text-white rounded-full hover:bg-red-600 transition-colors"
                                >
                                    <FaTrash size={14} />
                                </button>
                            </div>
                        </div>

                        <p className="text-slate-300 mb-4">{offer.description}</p>

                        <div className="flex items-baseline mb-4">
                            <span className="text-4xl font-bold text-white">₹{offer.price.toLocaleString()}</span>
                            <span className="text-lg text-slate-400 line-through ml-3">₹{offer.originalPrice.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-bold border border-emerald-500/30">
                                Save {offer.savingsPercent}%
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${offer.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                {offer.isActive ? 'Active' : 'Inactive'}
                            </span>
                            {offer.isHomeFeatured && (
                                <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs border border-blue-500/30 ml-2">
                                    Home Featured
                                </span>
                            )}
                        </div>

                        <div className="mt-2 text-xs text-slate-500">
                            Order: {offer.order}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
