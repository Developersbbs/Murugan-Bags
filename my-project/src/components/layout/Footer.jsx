import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaWhatsapp } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-8 mt-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Logo & Address */}
          <div>
            {/* Logo */}
            <div className="flex items-center space-x-2 mb-6">
              <img className='w-12 h-12' src="/Asset 1 1.svg" alt="Murugan Bags Logo" />
              <span className="text-xl font-bold tracking-tight text-white">
                MURUGAN BAGS
              </span>
            </div>

            {/* Address */}
            <div>
              <address className="not-italic text-gray-400 text-sm leading-relaxed">
                <p>NO 1/196, GOLDEN PRADISE,</p>
                <p>GNANAPRAKASAM STREET,</p>
                <p>LAKSHMI NAGAR, THARAPAKKAM,</p>
                <p>CHENNAI - 122</p>
              </address>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/products" className="text-gray-400 hover:text-white transition-colors">Products</Link></li>
              <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors">About</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-2">
              <li><Link to="/shipping" className="text-gray-400 hover:text-white transition-colors">Shipping Policy</Link></li>
              <li><Link to="/returns" className="text-gray-400 hover:text-white transition-colors">Returns & Refunds</Link></li>
              <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Shop by Category */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Shop by Category</h3>
            <ul className="space-y-2">
              <li><span className="text-gray-400 hover:text-white transition-colors cursor-pointer">Backpacks</span></li>
              <li><span className="text-gray-400 hover:text-white transition-colors cursor-pointer">Trolley Bags</span></li>
              <li><span className="text-gray-400 hover:text-white transition-colors cursor-pointer">School Bags</span></li>
              <li><span className="text-gray-400 hover:text-white transition-colors cursor-pointer">Laptop Bags</span></li>
              <li><span className="text-gray-400 hover:text-white transition-colors cursor-pointer">Duffle Bags</span></li>
            </ul>
          </div>

          {/* Contact Us - Separate Column */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <div className="text-gray-400 text-sm space-y-3">
              <p className="flex items-start">
                <span className="font-medium text-white mr-2">Phone:</span>
                <a href="tel:+919884000951" className="hover:text-white transition-colors">+91 98840 00951</a>
              </p>
              <p className="flex items-start">
                <span className="font-medium text-white mr-2">Email:</span>
                <a href="mailto:info@muruganbags.com" className="hover:text-white transition-colors break-all">info@muruganbags.com</a>
              </p>
            </div>

            {/* Social Media Icons */}
            <div className="mt-6">
              <h4 className="text-base font-semibold mb-3">Follow Us</h4>
              <div className="flex space-x-3">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors duration-300">
                  <FaFacebook className="w-4 h-4" />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors duration-300">
                  <FaInstagram className="w-4 h-4" />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors duration-300">
                  <FaTwitter className="w-4 h-4" />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors duration-300">
                  <FaLinkedin className="w-4 h-4" />
                </a>
                <a href="https://wa.me/919884000951" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors duration-300">
                  <FaWhatsapp className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Murugan Bags. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
