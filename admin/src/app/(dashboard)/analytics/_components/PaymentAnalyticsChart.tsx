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
import { PaymentAnalytics } from "@/services/analytics/types";
import ExportButton from "./ExportButton";

interface PaymentAnalyticsChartProps {
    data: PaymentAnalytics[];
    onExport: () => Promise<void>;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export default function PaymentAnalyticsChart({ data, onExport }: PaymentAnalyticsChartProps) {
    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined || isNaN(value)) return '₹0';
        return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Payment Analytics</CardTitle>
                    <CardDescription>Payment method distribution and success rates</CardDescription>
                </div>
                <ExportButton onExport={onExport} filename="payment-analytics" />
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Payment Method Distribution */}
                    <div>
                        <h3 className="text-sm font-medium mb-4">Payment Method Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={data}
                                    dataKey="totalCount"
                                    nameKey="paymentMethod"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={(entry) => `${entry.paymentMethod}: ${entry.totalCount}`}
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Revenue by Payment Method */}
                    <div>
                        <h3 className="text-sm font-medium mb-4">Revenue by Payment Method</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="paymentMethod" />
                                <YAxis tickFormatter={formatCurrency} />
                                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                <Legend />
                                <Bar dataKey="totalRevenue" fill="#10b981" name="Revenue" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Success Rate Cards */}
                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {data.map((payment, index) => (
                        <Card key={index}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium capitalize">{payment.paymentMethod}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{payment.successRate.toFixed(1)}%</div>
                                <p className="text-xs text-muted-foreground">Success Rate</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
