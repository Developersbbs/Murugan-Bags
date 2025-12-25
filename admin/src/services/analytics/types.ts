// Analytics Data Types

export interface SalesOverview {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    avgOrderValue: number;
    totalShippingCost: number;
    statusBreakdown: Array<{
        status: string;
        count: number;
    }>;
    paymentBreakdown: Array<{
        method: string;
        count: number;
        revenue: number;
    }>;
}

export interface RevenueData {
    period: string;
    revenue: number;
    orders: number;
    avgOrderValue: number;
}

export interface ProductPerformance {
    productId: string;
    productName: string;
    sku: string;
    unitsSold: number;
    revenue: number;
    orderCount: number;
    currentStock: number;
    minStock: number;
    costPrice: number;
    sellingPrice: number;
    profit: number;
}

export interface CustomerAnalytics {
    customerId: string;
    customerName: string;
    email: string;
    phone: string;
    totalOrders: number;
    totalSpent: number;
    avgOrderValue: number;
    lastOrderDate: string;
    firstOrderDate: string;
    customerSince: string;
}

export interface OrderAnalytics {
    statusBreakdown: Array<{
        status: string;
        count: number;
        revenue: number;
    }>;
    paymentMethodBreakdown: Array<{
        method: string;
        count: number;
        revenue: number;
    }>;
    paymentStatusBreakdown: Array<{
        status: string;
        count: number;
        revenue: number;
    }>;
    shippingStats: {
        totalShippingCost: number;
        avgShippingCost: number;
    };
}

export interface InventoryAnalytics {
    summary: {
        totalProducts: number;
        lowStockProducts: number;
        outOfStockProducts: number;
        totalStockValue: number;
        totalStockUnits: number;
    };
    products: Array<{
        productName: string;
        sku: string;
        currentStock: number;
        minStock: number;
        stockStatus: string;
        costPrice: number;
        sellingPrice: number;
        stockValue: number;
        status: string;
    }>;
}

export interface CategoryPerformance {
    categoryId: string;
    categoryName: string;
    categorySlug: string;
    unitsSold: number;
    revenue: number;
    orderCount: number;
    avgOrderValue: number;
}

export interface PaymentAnalytics {
    paymentMethod: string;
    totalCount: number;
    totalRevenue: number;
    successRate: number;
    statusBreakdown: Array<{
        status: string;
        count: number;
        revenue: number;
    }>;
}

export interface DateRange {
    startDate?: string;
    endDate?: string;
}

export type ReportType =
    | 'sales-overview'
    | 'revenue'
    | 'products'
    | 'customers'
    | 'orders'
    | 'inventory'
    | 'categories'

export interface SalesStats {
    totalRevenue: number;
    count: number;
}

export interface DashboardSummary {
    today: SalesStats;
    yesterday: SalesStats;
    thisMonth: SalesStats;
    lastMonth: SalesStats;
    allTime: SalesStats;
    statusCounts: {
        total: number;
        pending: number;
        processing: number;
        delivered: number;
        cancelled: number;
        [key: string]: number;
    };
    weeklySales: Array<{
        date: string;
        sales: number;
        orders: number;
    }>;
    bestSellers: Array<{
        name: string;
        units: number;
        revenue: number;
    }>;
}

