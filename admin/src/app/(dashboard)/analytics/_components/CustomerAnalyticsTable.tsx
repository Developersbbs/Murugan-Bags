"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { CustomerAnalytics } from "@/services/analytics/types";
import ExportButton from "./ExportButton";
import { format } from "date-fns";

interface CustomerAnalyticsTableProps {
    data: CustomerAnalytics[];
    onExport: () => Promise<void>;
}

export default function CustomerAnalyticsTable({
    data,
    onExport,
}: CustomerAnalyticsTableProps) {
    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined || isNaN(value)) return '₹0.00';
        return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'MMM dd, yyyy');
        } catch {
            return '-';
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Customer Analytics</CardTitle>
                    <CardDescription>Top customers by total spending</CardDescription>
                </div>
                <ExportButton onExport={onExport} filename="customer-analytics" />
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Total Orders</TableHead>
                                <TableHead className="text-right">Total Spent</TableHead>
                                <TableHead className="text-right">Avg Order Value</TableHead>
                                <TableHead>Last Order</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        No data available
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((customer, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{customer.customerName}</TableCell>
                                        <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                                        <TableCell className="text-right">{customer.totalOrders}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(customer.totalSpent)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(customer.avgOrderValue)}</TableCell>
                                        <TableCell>{formatDate(customer.lastOrderDate)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
