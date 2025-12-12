'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaBox } from 'react-icons/fa';
import { ImageDropzone } from '@/components/shared/ImageDropzone';
import { storage } from '@/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface BulkOrder {
    _id: string;
    title: string;
    description: string;
    image?: string;
    price: number;
    minQuantity: number;
    isActive: boolean;
}

export default function BulkOrdersPage() {
    const [orders, setOrders] = useState<BulkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<BulkOrder | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        image: '',
        price: '',
        minQuantity: '',
        isActive: true
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const baseUrl = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await fetch(`${baseUrl}/bulk-orders/admin`);
            const data = await res.json();
            if (data.success) {
                setOrders(data.data);
            }
        } catch (error) {
            console.error('Error fetching bulk orders:', error);
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
            minQuantity: '',
            isActive: true
        });
        setIsEditing(false);
        setCurrentOrder(null);
        setSelectedFile(null);
    };

    const handleEdit = (order: BulkOrder) => {
        setCurrentOrder(order);
        setFormData({
            title: order.title,
            description: order.description || '',
            image: order.image || '',
            price: order.price.toString(),
            minQuantity: order.minQuantity.toString(),
            isActive: order.isActive
        });
        setIsEditing(true);
        setSelectedFile(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this bulk order package?')) return;

        try {
            const res = await fetch(`${baseUrl}/bulk-orders/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                fetchOrders();
            } else {
                alert('Failed to delete bulk order');
            }
        } catch (error) {
            console.error('Error deleting bulk order:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            let imageUrl = formData.image;

            if (selectedFile) {
                setUploading(true);
                const storageRef = ref(storage, `bulk-orders/${Date.now()}_${selectedFile.name}`);
                await uploadBytes(storageRef, selectedFile);
                imageUrl = await getDownloadURL(storageRef);
                setUploading(false);
            }

            const url = isEditing && currentOrder
                ? `${baseUrl}/bulk-orders/${currentOrder._id}`
                : `${baseUrl}/bulk-orders`;

            const method = isEditing && currentOrder ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    image: imageUrl,
                    price: parseFloat(formData.price),
                    minQuantity: parseInt(formData.minQuantity)
                })
            });

            const result = await res.json();

            if (result.success) {
                fetchOrders();
                resetForm();
                alert('Bulk order package saved successfully!');
            } else {
                alert(result.error || 'Operation failed');
            }
        } catch (error: any) {
            console.error('Error saving bulk order:', error);
            alert(`Error saving bulk order: ${error.message}`);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Bulk Orders Management</h1>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <FaPlus /> Add New Package
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-700">
                            {currentOrder ? 'Edit Bulk Order Package' : 'Add New Bulk Order Package'}
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
                                        placeholder="e.g., Corporate Gift Set"
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Includes customized branding..."
                                        rows="3"
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Price per Unit (₹)</label>
                                        <input
                                            type="number"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleInputChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Min Quantity</label>
                                        <input
                                            type="number"
                                            name="minQuantity"
                                            value={formData.minQuantity}
                                            onChange={handleInputChange}
                                            min="1"
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleInputChange}
                                        id="isActive"
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
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
                                        disabled={uploading}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {uploading ? 'Uploading...' : <><FaSave /> Save Package</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {orders.map((order) => (
                    <div key={order._id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-slate-800">{order.title}</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(order)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                >
                                    <FaEdit size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(order._id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                >
                                    <FaTrash size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4 mb-4">
                            {order.image && (
                                <img src={order.image} alt={order.title} className="w-24 h-24 object-cover rounded-lg" />
                            )}
                            <div>
                                <p className="text-slate-600 text-sm mb-2">{order.description}</p>
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <FaBox className="text-blue-500" />
                                    <span>Min Qty: {order.minQuantity}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                            <span className="text-2xl font-bold text-slate-800">₹{order.price.toLocaleString()}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                {order.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
