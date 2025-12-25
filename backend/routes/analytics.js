const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { sendCSVResponse, formatCurrency, formatDate, formatDateTime } = require('../utils/csvExport');

/**
 * Helper function to parse date range from query parameters
 */
function getDateRange(req) {
    const { startDate, endDate } = req.query;
    const dateFilter = {};

    if (startDate) {
        dateFilter.$gte = new Date(startDate);
    }

    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date
        dateFilter.$lte = end;
    }

    return Object.keys(dateFilter).length > 0 ? { order_time: dateFilter } : {};
}

/**
 * GET /api/analytics/sales-overview
 * Get overall sales metrics
 */
router.get('/sales-overview', async (req, res) => {
    try {
        const dateFilter = getDateRange(req);

        // Get total orders and revenue
        const orderStats = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$total_amount' },
                    totalShippingCost: { $sum: '$shipping_cost' },
                    avgOrderValue: { $avg: '$total_amount' }
                }
            }
        ]);

        // Get total customers
        const customerFilter = dateFilter.order_time
            ? { createdAt: { $gte: dateFilter.order_time.$gte, $lte: dateFilter.order_time.$lte } }
            : {};
        const totalCustomers = await Customer.countDocuments(customerFilter);

        // Get order status breakdown
        const statusBreakdown = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get payment method breakdown
        const paymentBreakdown = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$payment_method',
                    count: { $sum: 1 },
                    revenue: { $sum: '$total_amount' }
                }
            }
        ]);

        const stats = orderStats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            totalShippingCost: 0,
            avgOrderValue: 0
        };

        const overview = {
            totalRevenue: stats.totalRevenue,
            totalOrders: stats.totalOrders,
            totalCustomers: totalCustomers,
            avgOrderValue: stats.avgOrderValue,
            totalShippingCost: stats.totalShippingCost,
            statusBreakdown: statusBreakdown.map(s => ({
                status: s._id,
                count: s.count
            })),
            paymentBreakdown: paymentBreakdown.map(p => ({
                method: p._id,
                count: p.count,
                revenue: p.revenue
            }))
        };

        // CSV export
        if (req.query.format === 'csv') {
            const csvData = [{
                'Total Revenue': formatCurrency(overview.totalRevenue),
                'Total Orders': overview.totalOrders,
                'Total Customers': overview.totalCustomers,
                'Average Order Value': formatCurrency(overview.avgOrderValue),
                'Total Shipping Cost': formatCurrency(overview.totalShippingCost)
            }];

            const fields = [
                { key: 'Total Revenue', label: 'Total Revenue' },
                { key: 'Total Orders', label: 'Total Orders' },
                { key: 'Total Customers', label: 'Total Customers' },
                { key: 'Average Order Value', label: 'Average Order Value' },
                { key: 'Total Shipping Cost', label: 'Total Shipping Cost' }
            ];

            return sendCSVResponse(res, csvData, fields, 'sales-overview');
        }

        res.json({ success: true, data: overview });
    } catch (error) {
        console.error('Error fetching sales overview:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch sales overview', error: error.message });
    }
});

/**
 * GET /api/analytics/revenue
 * Get revenue analytics with time-based breakdown
 */
router.get('/revenue', async (req, res) => {
    try {
        const dateFilter = getDateRange(req);
        const { groupBy = 'day' } = req.query; // day, week, month, year

        // Determine grouping format
        let dateFormat;
        switch (groupBy) {
            case 'year':
                dateFormat = { $dateToString: { format: '%Y', date: '$order_time' } };
                break;
            case 'month':
                dateFormat = { $dateToString: { format: '%Y-%m', date: '$order_time' } };
                break;
            case 'week':
                dateFormat = { $dateToString: { format: '%Y-W%V', date: '$order_time' } };
                break;
            case 'day':
            default:
                dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$order_time' } };
                break;
        }

        const revenueData = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: dateFormat,
                    revenue: { $sum: '$total_amount' },
                    orders: { $sum: 1 },
                    avgOrderValue: { $avg: '$total_amount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const formattedData = revenueData.map(item => ({
            period: item._id,
            revenue: item.revenue,
            orders: item.orders,
            avgOrderValue: item.avgOrderValue
        }));

        // CSV export
        if (req.query.format === 'csv') {
            const fields = [
                { key: 'period', label: 'Period' },
                { key: 'revenue', label: 'Revenue', formatter: formatCurrency },
                { key: 'orders', label: 'Orders' },
                { key: 'avgOrderValue', label: 'Average Order Value', formatter: formatCurrency }
            ];

            return sendCSVResponse(res, formattedData, fields, 'revenue-analytics');
        }

        res.json({ success: true, data: formattedData });
    } catch (error) {
        console.error('Error fetching revenue analytics:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch revenue analytics', error: error.message });
    }
});

/**
 * GET /api/analytics/products
 * Get product performance analytics
 */
router.get('/products', async (req, res) => {
    try {
        const dateFilter = getDateRange(req);

        // Get product sales data from orders
        const productSales = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product_id',
                    unitsSold: { $sum: '$items.quantity' },
                    revenue: { $sum: '$items.subtotal' },
                    orderCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $project: {
                    productId: '$_id',
                    productName: '$product.name',
                    sku: '$product.sku',
                    unitsSold: 1,
                    revenue: 1,
                    orderCount: 1,
                    currentStock: '$product.baseStock',
                    minStock: '$product.minStock',
                    costPrice: '$product.cost_price',
                    sellingPrice: '$product.selling_price'
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 100 } // Limit to top 100 products
        ]);

        const formattedData = productSales.map(item => ({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            unitsSold: item.unitsSold,
            revenue: item.revenue,
            orderCount: item.orderCount,
            currentStock: item.currentStock || 0,
            minStock: item.minStock || 0,
            costPrice: item.costPrice || 0,
            sellingPrice: item.sellingPrice || 0,
            profit: (item.sellingPrice - item.costPrice) * item.unitsSold
        }));

        // CSV export
        if (req.query.format === 'csv') {
            const fields = [
                { key: 'productName', label: 'Product Name' },
                { key: 'sku', label: 'SKU' },
                { key: 'unitsSold', label: 'Units Sold' },
                { key: 'revenue', label: 'Revenue', formatter: formatCurrency },
                { key: 'orderCount', label: 'Order Count' },
                { key: 'currentStock', label: 'Current Stock' },
                { key: 'minStock', label: 'Min Stock' },
                { key: 'costPrice', label: 'Cost Price', formatter: formatCurrency },
                { key: 'sellingPrice', label: 'Selling Price', formatter: formatCurrency },
                { key: 'profit', label: 'Profit', formatter: formatCurrency }
            ];

            return sendCSVResponse(res, formattedData, fields, 'product-performance');
        }

        res.json({ success: true, data: formattedData });
    } catch (error) {
        console.error('Error fetching product analytics:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch product analytics', error: error.message });
    }
});

/**
 * GET /api/analytics/customers
 * Get customer analytics
 */
router.get('/customers', async (req, res) => {
    try {
        const dateFilter = getDateRange(req);

        // Get customer purchase data
        const customerData = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$customer_id',
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: '$total_amount' },
                    avgOrderValue: { $avg: '$total_amount' },
                    lastOrderDate: { $max: '$order_time' },
                    firstOrderDate: { $min: '$order_time' }
                }
            },
            {
                $lookup: {
                    from: 'customers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: '$customer' },
            {
                $project: {
                    customerId: '$_id',
                    customerName: '$customer.name',
                    email: '$customer.email',
                    phone: '$customer.phone',
                    totalOrders: 1,
                    totalSpent: 1,
                    avgOrderValue: 1,
                    lastOrderDate: 1,
                    firstOrderDate: 1,
                    customerSince: '$customer.createdAt'
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 100 } // Top 100 customers
        ]);

        // CSV export
        if (req.query.format === 'csv') {
            const fields = [
                { key: 'customerName', label: 'Customer Name' },
                { key: 'email', label: 'Email' },
                { key: 'phone', label: 'Phone' },
                { key: 'totalOrders', label: 'Total Orders' },
                { key: 'totalSpent', label: 'Total Spent', formatter: formatCurrency },
                { key: 'avgOrderValue', label: 'Average Order Value', formatter: formatCurrency },
                { key: 'lastOrderDate', label: 'Last Order Date', formatter: formatDate },
                { key: 'firstOrderDate', label: 'First Order Date', formatter: formatDate },
                { key: 'customerSince', label: 'Customer Since', formatter: formatDate }
            ];

            return sendCSVResponse(res, customerData, fields, 'customer-analytics');
        }

        res.json({ success: true, data: customerData });
    } catch (error) {
        console.error('Error fetching customer analytics:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch customer analytics', error: error.message });
    }
});

/**
 * GET /api/analytics/orders
 * Get order analytics
 */
router.get('/orders', async (req, res) => {
    try {
        const dateFilter = getDateRange(req);

        // Get order statistics
        const orderStats = await Order.aggregate([
            { $match: dateFilter },
            {
                $facet: {
                    statusBreakdown: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 },
                                revenue: { $sum: '$total_amount' }
                            }
                        }
                    ],
                    paymentMethodBreakdown: [
                        {
                            $group: {
                                _id: '$payment_method',
                                count: { $sum: 1 },
                                revenue: { $sum: '$total_amount' }
                            }
                        }
                    ],
                    paymentStatusBreakdown: [
                        {
                            $group: {
                                _id: '$payment_status',
                                count: { $sum: 1 },
                                revenue: { $sum: '$total_amount' }
                            }
                        }
                    ],
                    shippingStats: [
                        {
                            $group: {
                                _id: null,
                                totalShippingCost: { $sum: '$shipping_cost' },
                                avgShippingCost: { $avg: '$shipping_cost' }
                            }
                        }
                    ]
                }
            }
        ]);

        const stats = orderStats[0];

        const data = {
            statusBreakdown: stats.statusBreakdown.map(s => ({
                status: s._id,
                count: s.count,
                revenue: s.revenue
            })),
            paymentMethodBreakdown: stats.paymentMethodBreakdown.map(p => ({
                method: p._id,
                count: p.count,
                revenue: p.revenue
            })),
            paymentStatusBreakdown: stats.paymentStatusBreakdown.map(p => ({
                status: p._id,
                count: p.count,
                revenue: p.revenue
            })),
            shippingStats: stats.shippingStats[0] || {
                totalShippingCost: 0,
                avgShippingCost: 0
            }
        };

        // CSV export
        if (req.query.format === 'csv') {
            const csvData = [
                ...data.statusBreakdown.map(s => ({
                    Category: 'Order Status',
                    Type: s.status,
                    Count: s.count,
                    Revenue: formatCurrency(s.revenue)
                })),
                ...data.paymentMethodBreakdown.map(p => ({
                    Category: 'Payment Method',
                    Type: p.method,
                    Count: p.count,
                    Revenue: formatCurrency(p.revenue)
                })),
                ...data.paymentStatusBreakdown.map(p => ({
                    Category: 'Payment Status',
                    Type: p.status,
                    Count: p.count,
                    Revenue: formatCurrency(p.revenue)
                }))
            ];

            const fields = [
                { key: 'Category', label: 'Category' },
                { key: 'Type', label: 'Type' },
                { key: 'Count', label: 'Count' },
                { key: 'Revenue', label: 'Revenue' }
            ];

            return sendCSVResponse(res, csvData, fields, 'order-analytics');
        }

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching order analytics:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch order analytics', error: error.message });
    }
});

/**
 * GET /api/analytics/inventory
 * Get inventory analytics
 */
router.get('/inventory', async (req, res) => {
    try {
        // Get all products with stock information
        const products = await Product.find({
            product_structure: 'simple'
        }).select('name sku baseStock minStock cost_price selling_price status');

        const inventoryData = products.map(product => ({
            productName: product.name,
            sku: product.sku,
            currentStock: product.baseStock || 0,
            minStock: product.minStock || 0,
            stockStatus: (product.baseStock || 0) <= (product.minStock || 0) ? 'Low Stock' : 'In Stock',
            costPrice: product.cost_price || 0,
            sellingPrice: product.selling_price || 0,
            stockValue: (product.baseStock || 0) * (product.cost_price || 0),
            status: product.status
        }));

        // Calculate summary statistics
        const summary = {
            totalProducts: inventoryData.length,
            lowStockProducts: inventoryData.filter(p => p.stockStatus === 'Low Stock').length,
            outOfStockProducts: inventoryData.filter(p => p.currentStock === 0).length,
            totalStockValue: inventoryData.reduce((sum, p) => sum + p.stockValue, 0),
            totalStockUnits: inventoryData.reduce((sum, p) => sum + p.currentStock, 0)
        };

        // CSV export
        if (req.query.format === 'csv') {
            const fields = [
                { key: 'productName', label: 'Product Name' },
                { key: 'sku', label: 'SKU' },
                { key: 'currentStock', label: 'Current Stock' },
                { key: 'minStock', label: 'Min Stock' },
                { key: 'stockStatus', label: 'Stock Status' },
                { key: 'costPrice', label: 'Cost Price', formatter: formatCurrency },
                { key: 'sellingPrice', label: 'Selling Price', formatter: formatCurrency },
                { key: 'stockValue', label: 'Stock Value', formatter: formatCurrency },
                { key: 'status', label: 'Status' }
            ];

            return sendCSVResponse(res, inventoryData, fields, 'inventory-report');
        }

        res.json({ success: true, data: { summary, products: inventoryData } });
    } catch (error) {
        console.error('Error fetching inventory analytics:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch inventory analytics', error: error.message });
    }
});

/**
 * GET /api/analytics/categories
 * Get category performance analytics
 */
router.get('/categories', async (req, res) => {
    try {
        const dateFilter = getDateRange(req);

        // Get category performance from orders
        const categoryData = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            { $unwind: '$product.categories' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.categories.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $group: {
                    _id: '$category._id',
                    categoryName: { $first: '$category.name' },
                    categorySlug: { $first: '$category.slug' },
                    unitsSold: { $sum: '$items.quantity' },
                    revenue: { $sum: '$items.subtotal' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        const formattedData = categoryData.map(item => ({
            categoryId: item._id,
            categoryName: item.categoryName,
            categorySlug: item.categorySlug,
            unitsSold: item.unitsSold,
            revenue: item.revenue,
            orderCount: item.orderCount,
            avgOrderValue: item.revenue / item.orderCount
        }));

        // CSV export
        if (req.query.format === 'csv') {
            const fields = [
                { key: 'categoryName', label: 'Category Name' },
                { key: 'categorySlug', label: 'Category Slug' },
                { key: 'unitsSold', label: 'Units Sold' },
                { key: 'revenue', label: 'Revenue', formatter: formatCurrency },
                { key: 'orderCount', label: 'Order Count' },
                { key: 'avgOrderValue', label: 'Average Order Value', formatter: formatCurrency }
            ];

            return sendCSVResponse(res, formattedData, fields, 'category-performance');
        }

        res.json({ success: true, data: formattedData });
    } catch (error) {
        console.error('Error fetching category analytics:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch category analytics', error: error.message });
    }
});

/**
 * GET /api/analytics/payments
 * Get payment analytics
 */
router.get('/payments', async (req, res) => {
    try {
        const dateFilter = getDateRange(req);

        // Get payment analytics
        const paymentData = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: {
                        method: '$payment_method',
                        status: '$payment_status'
                    },
                    count: { $sum: 1 },
                    revenue: { $sum: '$total_amount' }
                }
            },
            {
                $group: {
                    _id: '$_id.method',
                    totalCount: { $sum: '$count' },
                    totalRevenue: { $sum: '$revenue' },
                    statusBreakdown: {
                        $push: {
                            status: '$_id.status',
                            count: '$count',
                            revenue: '$revenue'
                        }
                    }
                }
            }
        ]);

        const formattedData = paymentData.map(item => {
            const successfulPayments = item.statusBreakdown.find(s => s.status === 'completed' || s.status === 'success');
            const successRate = successfulPayments
                ? (successfulPayments.count / item.totalCount) * 100
                : 0;

            return {
                paymentMethod: item._id,
                totalCount: item.totalCount,
                totalRevenue: item.totalRevenue,
                successRate: successRate,
                statusBreakdown: item.statusBreakdown
            };
        });

        // CSV export
        if (req.query.format === 'csv') {
            const csvData = formattedData.flatMap(item =>
                item.statusBreakdown.map(status => ({
                    'Payment Method': item.paymentMethod,
                    'Payment Status': status.status,
                    'Count': status.count,
                    'Revenue': formatCurrency(status.revenue),
                    'Success Rate': `${item.successRate.toFixed(2)}%`
                }))
            );

            const fields = [
                { key: 'Payment Method', label: 'Payment Method' },
                { key: 'Payment Status', label: 'Payment Status' },
                { key: 'Count', label: 'Count' },
                { key: 'Revenue', label: 'Revenue' },
                { key: 'Success Rate', label: 'Success Rate' }
            ];

            return sendCSVResponse(res, csvData, fields, 'payment-analytics');
        }

        res.json({ success: true, data: formattedData });
    } catch (error) {
        console.error('Error fetching payment analytics:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch payment analytics', error: error.message });
    }
});

/**
 * GET /api/analytics/dashboard-summary
 * Get consolidated stats for dashboard cards and charts
 */
router.get('/dashboard-summary', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

        // Helper to run sales stats aggregation
        const getSalesStats = async (matchStage) => {
            const result = await Order.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$total_amount' },
                        count: { $sum: 1 }
                    }
                }
            ]);
            return result[0] || { totalRevenue: 0, count: 0 };
        };

        // Helper for status counts
        const getStatusCounts = async () => {
            const result = await Order.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const counts = {
                total: 0,
                pending: 0,
                processing: 0,
                delivered: 0,
                cancelled: 0
            };

            result.forEach(item => {
                const status = item._id.toLowerCase();
                counts.total += item.count;
                if (counts.hasOwnProperty(status)) {
                    counts[status] = item.count;
                }
            });
            return counts;
        };

        // Helper for weekly sales (last 7 days)
        const getWeeklySales = async () => {
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

            const result = await Order.aggregate([
                {
                    $match: {
                        order_time: { $gte: sevenDaysAgo, $lt: tomorrow }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$order_time' } },
                        sales: { $sum: '$total_amount' },
                        orders: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            // Fill in missing days
            const days = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(sevenDaysAgo);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                const existing = result.find(r => r._id === dateStr);
                days.push({
                    date: dateStr,
                    sales: existing ? existing.sales : 0,
                    orders: existing ? existing.orders : 0
                });
            }
            return days;
        };

        // Helper for best selling products
        const getBestSellers = async () => {
            const result = await Order.aggregate([
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.product_id',
                        totalUnits: { $sum: '$items.quantity' },
                        totalRevenue: { $sum: '$items.subtotal' }
                    }
                },
                { $sort: { totalUnits: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                { $unwind: '$product' },
                {
                    $project: {
                        name: '$product.name',
                        units: '$totalUnits',
                        revenue: '$totalRevenue'
                    }
                }
            ]);
            return result;
        };

        const [
            todayStats,
            yesterdayStats,
            thisMonthStats,
            lastMonthStats,
            allTimeStats,
            statusCounts,
            weeklySales,
            bestSellers
        ] = await Promise.all([
            getSalesStats({ order_time: { $gte: today, $lt: tomorrow } }),
            getSalesStats({ order_time: { $gte: yesterday, $lt: today } }),
            getSalesStats({ order_time: { $gte: startOfMonth } }),
            getSalesStats({ order_time: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
            getSalesStats({}),
            getStatusCounts(),
            getWeeklySales(),
            getBestSellers()
        ]);

        res.json({
            success: true,
            data: {
                today: todayStats,
                yesterday: yesterdayStats,
                thisMonth: thisMonthStats,
                lastMonth: lastMonthStats,
                allTime: allTimeStats,
                statusCounts,
                weeklySales,
                bestSellers
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary', error: error.message });
    }
});

module.exports = router;
