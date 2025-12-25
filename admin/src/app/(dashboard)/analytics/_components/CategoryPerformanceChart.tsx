"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";
import { CategoryPerformance } from "@/services/analytics/types";
import ExportButton from "./ExportButton";

interface CategoryPerformanceChartProps {
    data: CategoryPerformance[];
    onExport: () => Promise<void>;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function CategoryPerformanceChart({ data, onExport }: CategoryPerformanceChartProps) {
    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined || isNaN(value)) return '₹0';
        return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Category Performance</CardTitle>
                    <CardDescription>Revenue and sales by category</CardDescription>
                </div>
                <ExportButton onExport={onExport} filename="category-performance" />
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Revenue Bar Chart */}
                    <div>
                        <h3 className="text-sm font-medium mb-4">Revenue by Category</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data} layout="horizontal">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tickFormatter={formatCurrency} />
                                <YAxis type="category" dataKey="categoryName" width={100} />
                                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                <Bar dataKey="revenue" fill="#10b981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Units Sold Pie Chart */}
                    <div>
                        <h3 className="text-sm font-medium mb-4">Units Sold Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={data}
                                    dataKey="unitsSold"
                                    nameKey="categoryName"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={(entry) => `${entry.categoryName}: ${entry.unitsSold}`}
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
                </div>
            </CardContent>
        </Card>
    );
}
