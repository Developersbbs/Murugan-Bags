import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaPaperPlane, FaClock } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const ContactPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success('Message sent successfully! We will get back to you soon.');
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (error) {
            toast.error('Failed to send message. Please try again later.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white">
            <Helmet>
                <title>Contact Us - Murugan Bags</title>
                <meta name="description" content="Get in touch with Murugan Bags for any inquiries or support." />
            </Helmet>

            {/* Hero Section */}
            <section className="bg-gray-50 py-16 border-b border-gray-100">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Contact Us</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Have questions about our products or need assistance? Reach out to us, and we'll be happy to help!
                    </p>
                </div>
            </section>

            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                        {/* Contact Information */}
                        <div className="lg:col-span-1 space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-8 border-b pb-4">Get In Touch</h2>
                                <div className="space-y-6">
                                    <div className="flex items-start">
                                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                                            <FaPhoneAlt />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">Phone</h4>
                                            <p className="text-gray-600">+91 98840 00951</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start">
                                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                                            <FaEnvelope />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">Email</h4>
                                            <p className="text-gray-600">info@muruganbags.com</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start">
                                        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                                            <FaMapMarkerAlt />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">Office Address</h4>
                                            <div className="text-gray-600 text-sm leading-relaxed">
                                                <p>NO 1/196, GOLDEN PRADISE,</p>
                                                <p>GNANAPRAKASAM STREET,</p>
                                                <p>LAKSHMI NAGAR, THARAPAKKAM,</p>
                                                <p>CHENNAI - 122</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start">
                                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                                            <FaClock />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">Business Hours</h4>
                                            <p className="text-gray-600 text-sm">Mon - Sat: 9:00 AM - 6:00 PM</p>
                                            <p className="text-gray-600 text-sm">Sunday: Closed</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-100 p-8 md:p-12">
                                <h2 className="text-3xl font-bold text-gray-900 mb-8">Send us a Message</h2>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                                        <input
                                            type="text"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                            placeholder="Inquiry about School Bags"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                                        <textarea
                                            rows="5"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
                                            placeholder="Your message here..."
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-lg transform transition-all duration-200 active:scale-95 flex items-center justify-center space-x-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-blue-200'}`}
                                    >
                                        {isSubmitting ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <span>Send Message</span>
                                                <FaPaperPlane className="text-sm" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Map Section Placeholder */}
            <section className="h-[450px] bg-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                        <FaMapMarkerAlt className="text-5xl mx-auto mb-4 text-blue-600 opacity-50" />
                        <p className="text-lg">Google Map Integration Placeholder</p>
                        <p className="text-sm text-gray-400">Visit us at Gnanaprakasam Street, Tharapakkam, Chennai</p>
                    </div>
                </div>
                {/* Real iframe could be added here if needed */}
            </section>
        </div>
    );
};

export default ContactPage;
