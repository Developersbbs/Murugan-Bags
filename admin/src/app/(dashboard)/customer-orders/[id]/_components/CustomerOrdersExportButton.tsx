"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface CustomerOrdersExportButtonProps {
    customerId: string;
    customerName: string;
    hasOrders: boolean;
}

export default function CustomerOrdersExportButton({
    customerId,
    customerName,
    hasOrders
}: CustomerOrdersExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (!hasOrders) {
            toast.error("No orders to export");
            return;
        }

        try {
            setIsExporting(true);
            const toastId = toast.loading("Exporting orders...");

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/customers/${customerId}/orders/export/csv`
            );

            if (!response.ok) {
                throw new Error("Failed to export orders");
            }

            // Create a blob from the response
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            // Get filename from header or generate default
            const contentDisposition = response.headers.get("Content-Disposition");
            let filename = `customer_orders_${customerId}.csv`;
            if (contentDisposition) {
                const matches = /filename="([^"]*)"/.exec(contentDisposition);
                if (matches && matches[1]) {
                    filename = matches[1];
                }
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Orders exported successfully", { id: toastId });
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export orders");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || !hasOrders}
            className="ml-auto"
        >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
    );
}
