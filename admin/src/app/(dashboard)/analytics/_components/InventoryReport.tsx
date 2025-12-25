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
import { InventoryAnalytics } from "@/services/analytics/types";
import ExportButton from "./ExportButton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, TrendingDown } from "lucide-react";

interface InventoryReportProps {
    data: InventoryAnalytics;
    onExport: () => Promise<void>;
}

export default function InventoryReport({ data, onExport }: InventoryReportProps) {
    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined || isNaN(value)) return '₹0.00';
        return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getStockBadge = (status: string) => {
        if (status === "Low Stock") return <Badge variant="warning"><AlertTriangle className="h-3 w-3 mr-1" />{status}</Badge>;
        if (status === "Out of Stock") return <Badge variant="destructive"><TrendingDown className="h-3 w-3 mr-1" />Out of Stock</Badge>;
        return <Badge variant="success"><Package className="h-3 w-3 mr-1" />{status}</Badge>;
    };

    // Show only low stock and out of stock products in the table
    const criticalProducts = data.products.filter(
        p => p.stockStatus === "Low Stock" || p.currentStock === 0
    );

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.totalProducts}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{data.summary.lowStockProducts}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{data.summary.outOfStockProducts}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.summary.totalStockValue)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Critical Stock Items Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Inventory Report</CardTitle>
                        <CardDescription>Products requiring attention (low stock and out of stock)</CardDescription>
                    </div>
                    <ExportButton onExport={onExport} filename="inventory-report" />
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-right">Current Stock</TableHead>
                                    <TableHead className="text-right">Min Stock</TableHead>
                                    <TableHead className="text-right">Stock Value</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {criticalProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            All products are adequately stocked
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    criticalProducts.map((product, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{product.productName}</TableCell>
                                            <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                                            <TableCell className="text-right">{product.currentStock}</TableCell>
                                            <TableCell className="text-right">{product.minStock}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(product.stockValue)}</TableCell>
                                            <TableCell>{getStockBadge(product.stockStatus)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
