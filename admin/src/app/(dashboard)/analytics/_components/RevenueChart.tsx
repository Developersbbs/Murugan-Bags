"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { RevenueData } from "@/services/analytics/types";
import ExportButton from "./ExportButton";

interface RevenueChartProps {
    data: RevenueData[];
    onExport: () => Promise<void>;
}

export default function RevenueChart({ data, onExport }: RevenueChartProps) {
    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined || isNaN(value)) return '₹0';
        return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Revenue Trend</CardTitle>
                    <CardDescription>Revenue and orders over time</CardDescription>
                </div>
                <ExportButton onExport={onExport} filename="revenue-analytics" />
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="period"
                            tick={{ fontSize: 12 }}
                            tickMargin={10}
                        />
                        <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 12 }}
                            tickFormatter={formatCurrency}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                            formatter={(value: number, name: string) => {
                                if (name === 'Revenue' || name === 'Average Order Value') {
                                    return formatCurrency(value);
                                }
                                return value;
                            }}
                        />
                        <Legend />
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="revenue"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Revenue"
                            dot={{ r: 4 }}
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="orders"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            name="Orders"
                            dot={{ r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
