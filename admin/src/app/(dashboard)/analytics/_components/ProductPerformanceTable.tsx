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
import { ProductPerformance } from "@/services/analytics/types";
import ExportButton from "./ExportButton";
import { Badge } from "@/components/ui/badge";

interface ProductPerformanceTableProps {
    data: ProductPerformance[];
    onExport: () => Promise<void>;
}

export default function ProductPerformanceTable({
    data,
    onExport,
}: ProductPerformanceTableProps) {
    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined || isNaN(value)) return '₹0.00';
        return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getStockStatus = (current: number, min: number) => {
        if (current === 0) return { label: "Out of Stock", variant: "destructive" as const };
        if (current <= min) return { label: "Low Stock", variant: "warning" as const };
        return { label: "In Stock", variant: "success" as const };
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Product Performance</CardTitle>
                    <CardDescription>Top selling products and their metrics</CardDescription>
                </div>
                <ExportButton onExport={onExport} filename="product-performance" />
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product Name</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead className="text-right">Units Sold</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-right">Profit</TableHead>
                                <TableHead className="text-right">Stock</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                                        No data available
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((product, index) => {
                                    const stockStatus = getStockStatus(product.currentStock, product.minStock);
                                    return (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{product.productName}</TableCell>
                                            <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                                            <TableCell className="text-right">{product.unitsSold}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(product.revenue)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(product.profit)}</TableCell>
                                            <TableCell className="text-right">{product.currentStock}</TableCell>
                                            <TableCell>
                                                <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
