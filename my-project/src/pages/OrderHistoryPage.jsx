import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { getFullImageUrl } from "../utils/imageUtils";
import OrderDetailsModal from "../components/orders/OrderDetailsModal";

const PLACEHOLDER = "/images/products/placeholder-product.svg";

// Safe URL resolver — never throws, never calls getFullImageUrl on a null/empty value
const resolveImage = (img) => {
  if (!img) return PLACEHOLDER;

  // object wrappers (e.g. { url: '...' })
  if (typeof img === "object") {
    return resolveImage(img.url || img.secure_url || img.image || null);
  }

  if (typeof img !== "string" || img.trim() === "" || img === PLACEHOLDER)
    return PLACEHOLDER;

  // Already an absolute URL — return as-is
  if (img.startsWith("http://") || img.startsWith("https://")) return img;

  // Relative path — run through getFullImageUrl (which prepends the API base)
  try {
    const resolved = getFullImageUrl(img);
    return resolved || PLACEHOLDER;
  } catch {
    return PLACEHOLDER;
  }
};

// Pull the best image from an order item.
// The backend firebase route already resolves item.image for us (variant → product fallback).
const getItemImage = (item) => {
  if (!item) return PLACEHOLDER;

  // 1. Backend-resolved image field (most reliable — set by the firebase route)
  if (item.image && item.image !== PLACEHOLDER) return resolveImage(item.image);

  // 2. Variant-specific fields
  if (item.variant_image) return resolveImage(item.variant_image);
  if (Array.isArray(item.variant_images) && item.variant_images.length > 0)
    return resolveImage(item.variant_images[0]);

  // 3. Nested product object (populated populate)
  if (item.product) {
    const p = item.product;
    const imgUrl = p.image_url;
    if (Array.isArray(imgUrl) && imgUrl.length > 0) return resolveImage(imgUrl[0]);
    if (typeof imgUrl === "string" && imgUrl) return resolveImage(imgUrl);
    if (Array.isArray(p.images) && p.images.length > 0) return resolveImage(p.images[0]);
    if (p.image) return resolveImage(p.image);
  }

  return PLACEHOLDER;
};

// FIX 1: Variant name priority — backend sets item.name as "Product - Variant"
// but if explicit variant_name field exists, prefer it.
const getItemName = (item) =>
  item.variant_name ||
  item.product_variant?.name ||
  item.name ||
  item.product?.name ||
  "Product";

const getItemPrice = (item) => item.price ?? item.unit_price ?? 0;

// Transform raw firebase API order shape → shape OrderDetailsModal expects
const transformOrderForModal = (order) => {
  if (!order) return null;

  const items = (order.items || []).map((item) => ({
    ...item,
    id: item._id || item.id,
    name: getItemName(item),
    image: getItemImage(item),
    price: getItemPrice(item),
    quantity: item.quantity || 1,
    sku: item.sku || item.variant_sku || "N/A",
  }));

  const addr = order.shipping_address || {};
  const rawSubtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return {
    id: order._id || order.id,
    orderNumber: order.invoice_no || order._id,
    date: order.order_time || order.createdAt,
    status: order.status,
    trackingNumber: order.tracking_number || null,
    estimatedDelivery: order.estimated_delivery || null,
    items,
    shippingAddress: addr.name
      ? {
          name: addr.name,
          street: addr.street,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zipCode,
          country: addr.country || "India",
          phone: addr.phone,
          email: addr.email,
        }
      : typeof addr === "string"
      ? addr
      : null,
    paymentMethod:
      order.payment_method === "cash"
        ? "Cash on Delivery"
        : order.payment_method || "N/A",
    subtotal: rawSubtotal,
    shipping: order.shipping_cost ?? 0,
    tax: order.tax ?? rawSubtotal * 0.1,
    total: order.total_amount || order.total || 0,
  };
};

const OrderHistoryPage = () => {
  const { user } = useSelector((state) => state.auth);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // FIX 3: popup state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const firebaseUid =
          user?.uid ||
          user?.firebase_uid ||
          localStorage.getItem("firebaseUid") ||
          localStorage.getItem("uid") ||
          (() => {
            try {
              return JSON.parse(localStorage.getItem("user") || "{}")?.uid;
            } catch {
              return null;
            }
          })();

        if (!firebaseUid) {
          setError("Please log in to view your orders.");
          setLoading(false);
          return;
        }

        const token =
          localStorage.getItem("token") || localStorage.getItem("authToken");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(
          `/api/orders/customer/firebase/${firebaseUid}`,
          { headers }
        );

        if (!res.ok) throw new Error(`Server returned ${res.status}`);

        const data = await res.json();
        const raw = Array.isArray(data) ? data : data.data || data.orders || [];

        raw.sort(
          (a, b) =>
            new Date(b.order_time || b.createdAt || 0) -
            new Date(a.order_time || a.createdAt || 0)
        );

        setOrders(raw);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("Failed to load orders. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    if (typeof amount !== "number") return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const map = {
      delivered: "bg-green-100 text-green-800",
      shipped: "bg-blue-100 text-blue-800",
      dispatched: "bg-blue-100 text-blue-800",
      processing: "bg-yellow-100 text-yellow-800",
      pending: "bg-orange-100 text-orange-800",
      payment_pending: "bg-orange-100 text-orange-800",
      cancelled: "bg-red-100 text-red-800",
    };
    const key = (status || "").toLowerCase();
    const cls = map[key] || "bg-gray-100 text-gray-800";
    const label = status
      ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
      : "Unknown";
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
      >
        {label}
      </span>
    );
  };

  const handleOpenModal = (order) => {
    setSelectedOrder(transformOrderForModal(order));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("authToken");
      const res = await fetch(`/api/orders/${orderId}/invoice`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to download invoice");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Invoice download error:", err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-500">Loading your orders…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-rose-600 hover:bg-rose-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto lg:max-w-none">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            Order History
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Check the status of recent orders, manage returns, and download
            invoices.
          </p>

          <div className="mt-12">
            {orders.length === 0 ? (
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No orders
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  You haven't placed any orders yet.
                </p>
                <div className="mt-6">
                  <Link
                    to="/products"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-rose-600 hover:bg-rose-700"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {orders.map((order) => {
                  const orderId = order._id || order.id || order.invoice_no;
                  const invoiceNo = order.invoice_no || orderId;
                  const orderDate =
                    order.order_time || order.createdAt || order.created_at;
                  const orderTotal = order.total_amount || order.total || 0;
                  const items = Array.isArray(order.items) ? order.items : [];

                  return (
                    <div
                      key={orderId}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      {/* Order header */}
                      <div className="bg-gray-50 p-4 sm:px-6 sm:py-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Order #{invoiceNo}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              Placed on{" "}
                              <time dateTime={orderDate}>
                                {formatDate(orderDate)}
                              </time>
                            </p>
                          </div>
                          <div className="mt-3 sm:mt-0">
                            {getStatusBadge(order.status)}
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="divide-y divide-gray-200">
                        {items.length === 0 ? (
                          <div className="p-4 sm:px-6 text-sm text-gray-500">
                            No items found for this order.
                          </div>
                        ) : (
                          items.map((item, idx) => {
                            const itemKey = item._id || item.id || idx;
                            const imgSrc = getItemImage(item);
                            const itemName = getItemName(item);
                            const itemPrice = getItemPrice(item);

                            return (
                              <div key={itemKey} className="p-4 sm:px-6">
                                <div className="flex items-center">
                                  {/* FIX 3: image click → popup (not page navigation) */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenModal(order)}
                                    className="flex-shrink-0 h-16 w-16 overflow-hidden rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                                    aria-label={`View details for order ${invoiceNo}`}
                                  >
                                    <img
                                      src={imgSrc}
                                      alt={itemName}
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = PLACEHOLDER;
                                      }}
                                      className="h-full w-full object-cover object-center"
                                    />
                                  </button>

                                  <div className="ml-4 flex-1">
                                    <div className="flex justify-between text-base font-medium text-gray-900">
                                      {/* FIX 1: show variant name */}
                                      <h3>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenModal(order)}
                                          className="hover:text-rose-600 transition-colors text-left"
                                        >
                                          {itemName}
                                        </button>
                                      </h3>
                                      <p className="ml-4">
                                        {formatCurrency(itemPrice)}
                                      </p>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500">
                                      Qty: {item.quantity || 1}
                                    </p>
                                    {(item.variant_id || item.variant_sku) && (
                                      <p className="mt-0.5 text-xs text-gray-400">
                                        {item.variant_slug || item.variant_sku || ""}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer */}
                      <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                        <div className="flex justify-between text-sm font-medium text-gray-900">
                          <p>Total</p>
                          <p>{formatCurrency(orderTotal)}</p>
                        </div>
                        <div className="mt-4 flex space-x-3">
                          {/* FIX 3: "View Order" → popup */}
                          <button
                            type="button"
                            onClick={() => handleOpenModal(order)}
                            className="flex-1 flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                          >
                            View Order
                          </button>
                          {order.tracking_number && (
                            <Link
                              to={`/track/${order.tracking_number}`}
                              className="flex-1 flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                            >
                              Track Order
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FIX 3: Order details popup */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onTrackOrder={(trackingNumber) => {
          handleCloseModal();
          window.location.href = `/track/${trackingNumber}`;
        }}
        onDownloadInvoice={handleDownloadInvoice}
      />
    </div>
  );
};

export default OrderHistoryPage;