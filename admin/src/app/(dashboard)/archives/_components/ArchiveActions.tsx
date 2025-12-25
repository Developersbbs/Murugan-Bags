"use client";

import { Trash2, ArchiveRestore } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ActionAlertDialog } from "@/components/shared/ActionAlertDialog";
import { RowSelectionProps } from "@/types/data-table";
import { useAuthorization } from "@/hooks/use-authorization";

import { bulkDeleteProducts } from "@/actions/products/bulkDeleteProducts";
import { bulkRestoreProducts } from "@/actions/products/bulkRestoreProducts";

export default function ArchiveActions({
    rowSelection,
    setRowSelection,
    products = [],
}: RowSelectionProps & { products?: any[] }) {
    const { hasPermission } = useAuthorization();

    // Helper function to get actual product IDs from row selection
    const getSelectedProductIds = () => {
        return Object.entries(rowSelection)
            .filter(([index, isSelected]) => isSelected)
            .map(([index]) => {
                const productIndex = parseInt(index);
                return products?.[productIndex]?._id || products?.[productIndex]?.id;
            })
            .filter(Boolean);
    };

    const selectedCount = Object.keys(rowSelection).length;

    if (selectedCount === 0) return null;

    return (
        <Card className="mb-5 p-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-end items-center">
                <span className="text-sm text-muted-foreground mr-auto">
                    {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
                </span>

                {hasPermission("products", "canEdit") && (
                    <ActionAlertDialog
                        title={`Restore ${selectedCount} products?`}
                        description="These products will be moved back to the main Products list as Drafts."
                        actionButtonText="Restore Selected"
                        toastSuccessMessage="Products restored successfully"
                        queryKey="products"
                        action={() => bulkRestoreProducts(getSelectedProductIds())}
                        onSuccess={() => setRowSelection({})}
                    >
                        <Button
                            variant="outline"
                            size="default"
                            className="text-primary hover:bg-primary/10 border-primary/20"
                        >
                            <ArchiveRestore className="mr-2 size-4" />
                            Restore Selected
                        </Button>
                    </ActionAlertDialog>
                )}

                {hasPermission("products", "canDelete") && (
                    <ActionAlertDialog
                        title={`PERMANENTLY DELETE ${selectedCount} products?`}
                        description="This action CANNOT be undone. These products will be permanently removed from the database."
                        actionButtonText="Delete Permanently"
                        toastSuccessMessage="Products deleted permanently"
                        queryKey="products"
                        action={() => bulkDeleteProducts(getSelectedProductIds())}
                        onSuccess={() => setRowSelection({})}
                    >
                        <Button
                            variant="destructive"
                            size="default"
                        >
                            <Trash2 className="mr-2 size-4" />
                            Delete Selected
                        </Button>
                    </ActionAlertDialog>
                )}
            </div>
        </Card>
    );
}
