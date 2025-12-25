"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Legend,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from "recharts";
import { OrderAnalytics } from "@/services/analytics/types";
import ExportButton from "./ExportButton";

interface OrderAnalyticsChartsProps {
    data: OrderAnalytics;
    onExport: () => Promise<void>;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function OrderAnalyticsCharts({ data, onExport }: OrderAnalyticsChartsProps) {
    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined || isNaN(value)) return '₹0';
        return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Order Analytics</CardTitle>
                        <CardDescription>Order status and payment method breakdown</CardDescription>
                    </div>
                    <ExportButton onExport={onExport} filename="order-analytics" />
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Order Status Breakdown */}
                        <div>
                            <h3 className="text-sm font-medium mb-4">Order Status Distribution</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={data.statusBreakdown}
                                        dataKey="count"
                                        nameKey="status"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={(entry) => `${entry.status}: ${entry.count}`}
                                    >
                                        {data.statusBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Payment Method Breakdown */}
                        <div>
                            <h3 className="text-sm font-medium mb-4">Payment Method Distribution</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={data.paymentMethodBreakdown}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="method" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Shipping Stats */}
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Shipping Cost</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(data.shippingStats.totalShippingCost)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Average Shipping Cost</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(data.shippingStats.avgShippingCost)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
