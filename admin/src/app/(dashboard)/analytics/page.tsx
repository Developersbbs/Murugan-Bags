"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageTitle from "@/components/shared/PageTitle";
import DateRangePicker from "./_components/DateRangePicker";
import SalesOverviewCards from "./_components/SalesOverviewCards";
import RevenueChart from "./_components/RevenueChart";
import ProductPerformanceTable from "./_components/ProductPerformanceTable";
import CustomerAnalyticsTable from "./_components/CustomerAnalyticsTable";
import OrderAnalyticsCharts from "./_components/OrderAnalyticsCharts";
import InventoryReport from "./_components/InventoryReport";
import CategoryPerformanceChart from "./_components/CategoryPerformanceChart";
import PaymentAnalyticsChart from "./_components/PaymentAnalyticsChart";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    getSalesOverview,
    getRevenueAnalytics,
    getProductAnalytics,
    getCustomerAnalytics,
    getOrderAnalytics,
    getInventoryAnalytics,
    getCategoryAnalytics,
    getPaymentAnalytics,
    downloadSalesOverviewCSV,
    downloadRevenueCSV,
    downloadProductCSV,
    downloadCustomerCSV,
    downloadOrderCSV,
    downloadInventoryCSV,
    downloadCategoryCSV,
    downloadPaymentCSV,
} from "@/services/analytics";
import type {
    SalesOverview,
    RevenueData,
    ProductPerformance,
    CustomerAnalytics,
    OrderAnalytics,
    InventoryAnalytics,
    CategoryPerformance,
    PaymentAnalytics,
    DateRange,
} from "@/services/analytics/types";

export default function AnalyticsPage() {
    const { toast } = useToast();
    const [dateRange, setDateRange] = useState<DateRange>({});
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(false);

    // Data states
    const [salesOverview, setSalesOverview] = useState<SalesOverview | null>(null);
    const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
    const [productData, setProductData] = useState<ProductPerformance[]>([]);
    const [customerData, setCustomerData] = useState<CustomerAnalytics[]>([]);
    const [orderData, setOrderData] = useState<OrderAnalytics | null>(null);
    const [inventoryData, setInventoryData] = useState<InventoryAnalytics | null>(null);
    const [categoryData, setCategoryData] = useState<CategoryPerformance[]>([]);
    const [paymentData, setPaymentData] = useState<PaymentAnalytics[]>([]);

    const handleDateChange = (startDate?: Date, endDate?: Date) => {
        setDateRange({
            startDate: startDate?.toISOString().split('T')[0],
            endDate: endDate?.toISOString().split('T')[0],
        });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [
                overview,
                revenue,
                products,
                customers,
                orders,
                inventory,
                categories,
                payments,
            ] = await Promise.all([
                getSalesOverview(dateRange),
                getRevenueAnalytics(dateRange),
                getProductAnalytics(dateRange),
                getCustomerAnalytics(dateRange),
                getOrderAnalytics(dateRange),
                getInventoryAnalytics(),
                getCategoryAnalytics(dateRange),
                getPaymentAnalytics(dateRange),
            ]);

            setSalesOverview(overview);
            setRevenueData(revenue);
            setProductData(products);
            setCustomerData(customers);
            setOrderData(orders);
            setInventoryData(inventory);
            setCategoryData(categories);
            setPaymentData(payments);
        } catch (error) {
            console.error("Error fetching analytics:", error);
            toast({
                title: "Error",
                description: "Failed to fetch analytics data. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    if (loading && !salesOverview) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <PageTitle>Sales & Analytics</PageTitle>
                <DateRangePicker
                    startDate={dateRange.startDate ? new Date(dateRange.startDate) : undefined}
                    endDate={dateRange.endDate ? new Date(dateRange.endDate) : undefined}
                    onDateChange={handleDateChange}
                />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="revenue">Revenue</TabsTrigger>
                    <TabsTrigger value="products">Products</TabsTrigger>
                    <TabsTrigger value="customers">Customers</TabsTrigger>
                    <TabsTrigger value="orders">Orders</TabsTrigger>
                    <TabsTrigger value="inventory">Inventory</TabsTrigger>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {salesOverview && (
                        <>
                            <SalesOverviewCards data={salesOverview} />
                            {revenueData.length > 0 && (
                                <RevenueChart
                                    data={revenueData}
                                    onExport={() => downloadRevenueCSV(dateRange)}
                                />
                            )}
                        </>
                    )}
                </TabsContent>

                <TabsContent value="revenue" className="space-y-6">
                    {revenueData.length > 0 && (
                        <RevenueChart
                            data={revenueData}
                            onExport={() => downloadRevenueCSV(dateRange)}
                        />
                    )}
                </TabsContent>

                <TabsContent value="products" className="space-y-6">
                    <ProductPerformanceTable
                        data={productData}
                        onExport={() => downloadProductCSV(dateRange)}
                    />
                </TabsContent>

                <TabsContent value="customers" className="space-y-6">
                    <CustomerAnalyticsTable
                        data={customerData}
                        onExport={() => downloadCustomerCSV(dateRange)}
                    />
                </TabsContent>

                <TabsContent value="orders" className="space-y-6">
                    {orderData && (
                        <OrderAnalyticsCharts
                            data={orderData}
                            onExport={() => downloadOrderCSV(dateRange)}
                        />
                    )}
                </TabsContent>

                <TabsContent value="inventory" className="space-y-6">
                    {inventoryData && (
                        <InventoryReport
                            data={inventoryData}
                            onExport={() => downloadInventoryCSV()}
                        />
                    )}
                </TabsContent>

                <TabsContent value="categories" className="space-y-6">
                    {categoryData.length > 0 && (
                        <CategoryPerformanceChart
                            data={categoryData}
                            onExport={() => downloadCategoryCSV(dateRange)}
                        />
                    )}
                </TabsContent>

                <TabsContent value="payments" className="space-y-6">
                    {paymentData.length > 0 && (
                        <PaymentAnalyticsChart
                            data={paymentData}
                            onExport={() => downloadPaymentCSV(dateRange)}
                        />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
