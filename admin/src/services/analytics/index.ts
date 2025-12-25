import {
    SalesOverview,
    RevenueData,
    ProductPerformance,
    CustomerAnalytics,
    OrderAnalytics,
    InventoryAnalytics,
    CategoryPerformance,
    PaymentAnalytics,
    DateRange,
    ReportType,
    DashboardSummary
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Build query string from date range
 */
function buildQueryString(dateRange?: DateRange, format?: 'csv'): string {
    const params = new URLSearchParams();

    if (dateRange?.startDate) {
        params.append('startDate', dateRange.startDate);
    }

    if (dateRange?.endDate) {
        params.append('endDate', dateRange.endDate);
    }

    if (format === 'csv') {
        params.append('format', 'csv');
    }

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
}

/**
 * Generic fetch function for analytics endpoints
 */
async function fetchAnalytics<T>(
    endpoint: string,
    dateRange?: DateRange
): Promise<{ success: boolean; data: T }> {
    const queryString = buildQueryString(dateRange);
    const response = await fetch(`${API_BASE_URL}/api/analytics/${endpoint}${queryString}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint} analytics`);
    }

    return response.json();
}

/**
 * Download CSV file
 */
async function downloadCSV(
    endpoint: string,
    filename: string,
    dateRange?: DateRange
): Promise<void> {
    const queryString = buildQueryString(dateRange, 'csv');
    const response = await fetch(`${API_BASE_URL}/api/analytics/${endpoint}${queryString}`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to download ${filename}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

/**
 * Get sales overview analytics
 */
export async function getSalesOverview(dateRange?: DateRange): Promise<SalesOverview> {
    const result = await fetchAnalytics<SalesOverview>('sales-overview', dateRange);
    return result.data;
}

/**
 * Download sales overview as CSV
 */
export async function downloadSalesOverviewCSV(dateRange?: DateRange): Promise<void> {
    return downloadCSV('sales-overview', 'sales-overview.csv', dateRange);
}

/**
 * Get revenue analytics
 */
export async function getRevenueAnalytics(
    dateRange?: DateRange,
    groupBy: 'day' | 'week' | 'month' | 'year' = 'day'
): Promise<RevenueData[]> {
    const queryString = buildQueryString(dateRange);
    const separator = queryString ? '&' : '?';
    const response = await fetch(
        `${API_BASE_URL}/api/analytics/revenue${queryString}${separator}groupBy=${groupBy}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch revenue analytics');
    }

    const result = await response.json();
    return result.data;
}

/**
 * Download revenue analytics as CSV
 */
export async function downloadRevenueCSV(dateRange?: DateRange): Promise<void> {
    return downloadCSV('revenue', 'revenue-analytics.csv', dateRange);
}

/**
 * Get product performance analytics
 */
export async function getProductAnalytics(dateRange?: DateRange): Promise<ProductPerformance[]> {
    const result = await fetchAnalytics<ProductPerformance[]>('products', dateRange);
    return result.data;
}

/**
 * Download product analytics as CSV
 */
export async function downloadProductCSV(dateRange?: DateRange): Promise<void> {
    return downloadCSV('products', 'product-performance.csv', dateRange);
}

/**
 * Get customer analytics
 */
export async function getCustomerAnalytics(dateRange?: DateRange): Promise<CustomerAnalytics[]> {
    const result = await fetchAnalytics<CustomerAnalytics[]>('customers', dateRange);
    return result.data;
}

/**
 * Download customer analytics as CSV
 */
export async function downloadCustomerCSV(dateRange?: DateRange): Promise<void> {
    return downloadCSV('customers', 'customer-analytics.csv', dateRange);
}

/**
 * Get order analytics
 */
export async function getOrderAnalytics(dateRange?: DateRange): Promise<OrderAnalytics> {
    const result = await fetchAnalytics<OrderAnalytics>('orders', dateRange);
    return result.data;
}

/**
 * Download order analytics as CSV
 */
export async function downloadOrderCSV(dateRange?: DateRange): Promise<void> {
    return downloadCSV('orders', 'order-analytics.csv', dateRange);
}

/**
 * Get inventory analytics
 */
export async function getInventoryAnalytics(): Promise<InventoryAnalytics> {
    const result = await fetchAnalytics<InventoryAnalytics>('inventory');
    return result.data;
}

/**
 * Download inventory analytics as CSV
 */
export async function downloadInventoryCSV(): Promise<void> {
    return downloadCSV('inventory', 'inventory-report.csv');
}

/**
 * Get category performance analytics
 */
export async function getCategoryAnalytics(dateRange?: DateRange): Promise<CategoryPerformance[]> {
    const result = await fetchAnalytics<CategoryPerformance[]>('categories', dateRange);
    return result.data;
}

/**
 * Download category analytics as CSV
 */
export async function downloadCategoryCSV(dateRange?: DateRange): Promise<void> {
    return downloadCSV('categories', 'category-performance.csv', dateRange);
}

/**
 * Get payment analytics
 */
export async function getPaymentAnalytics(dateRange?: DateRange): Promise<PaymentAnalytics[]> {
    const result = await fetchAnalytics<PaymentAnalytics[]>('payments', dateRange);
    return result.data;
}

/**
 * Download payment analytics as CSV
 */
export async function downloadPaymentCSV(dateRange?: DateRange): Promise<void> {
    return downloadCSV('payments', 'payment-analytics.csv', dateRange);
}

/**
 * Get dashboard summary stats (Today, Yesterday, This Month, Last Month, All Time)
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
    const result = await fetchAnalytics<DashboardSummary>('dashboard-summary');
    return result.data;
}
