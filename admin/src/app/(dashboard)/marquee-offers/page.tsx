'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

export default function MarqueeOffersPage() {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentOffer, setCurrentOffer] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        icon: '🎁',
        order: 0,
        isActive: true
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const baseUrl = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

    // Common emojis for quick selection
    const commonEmojis = ['🚚', '🎁', '🔥', '✨', '↩️', '💰', '⚡', '🎉', '🏆', '💎', '🌟', '🎯'];

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        try {
            const res = await fetch(`${baseUrl}/marquee-offers/admin`);
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

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            icon: '🎁',
            order: 0,
            isActive: true
        });
        setIsEditing(false);
        setCurrentOffer(null);
    };

    const handleEdit = (offer) => {
        setCurrentOffer(offer);
        setFormData({
            title: offer.title,
            description: offer.description || '',
            icon: offer.icon || '🎁',
            order: offer.order || 0,
            isActive: offer.isActive
        });
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this marquee offer?')) return;

        try {
            const res = await fetch(`${baseUrl}/marquee-offers/${id}`, {
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const url = isEditing && currentOffer
                ? `${baseUrl}/marquee-offers/${currentOffer._id}`
                : `${baseUrl}/marquee-offers`;

            const method = isEditing && currentOffer ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await res.json();

            if (result.success) {
                fetchOffers();
                resetForm();
                alert('Marquee offer saved successfully!');
            } else {
                alert(result.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Error saving offer:', error);
            alert(`Error saving offer: ${error.message}`);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Marquee Offers Management</h1>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors"
                    >
                        <FaPlus /> Add New Offer
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-700">
                            {currentOffer ? 'Edit Marquee Offer' : 'Add New Marquee Offer'}
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
                                        placeholder="e.g., Free Shipping"
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <input
                                        type="text"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="e.g., On orders above ₹999"
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Icon/Emoji</label>
                                    <input
                                        type="text"
                                        name="icon"
                                        value={formData.icon}
                                        onChange={handleInputChange}
                                        placeholder="Enter emoji"
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-2xl"
                                        maxLength="2"
                                    />
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {commonEmojis.map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                                                className="w-10 h-10 bg-slate-100 hover:bg-rose-100 rounded-lg flex items-center justify-center text-xl transition-colors"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
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
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleInputChange}
                                        id="isActive"
                                        className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                                    />
                                    <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active</label>
                                </div>

                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                    <p className="text-xs text-slate-600 mb-2">Preview:</p>
                                    <div className="flex items-center space-x-3 bg-white p-3 rounded-lg">
                                        <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-xl">
                                            {formData.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">{formData.title || 'Title'}</h3>
                                            <p className="text-sm text-slate-600">{formData.description || 'Description'}</p>
                                        </div>
                                    </div>
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
                                        <FaSave /> Save Offer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offers.map((offer) => (
                    <div key={offer._id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 group hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-2xl">
                                    {offer.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{offer.title}</h3>
                                    <p className="text-sm text-slate-600">{offer.description}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEdit(offer)}
                                    className="p-2 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 hover:text-rose-600 transition-colors"
                                >
                                    <FaEdit size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(offer._id)}
                                    className="p-2 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 hover:text-red-600 transition-colors"
                                >
                                    <FaTrash size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${offer.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                {offer.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-slate-500">Order: {offer.order}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
