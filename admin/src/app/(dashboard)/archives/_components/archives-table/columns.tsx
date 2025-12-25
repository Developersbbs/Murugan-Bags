"use client";

import Link from "next/link";
import { ZoomIn, Trash2, ArchiveRestore } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { Checkbox } from "@/components/ui/checkbox";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Typography from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/helpers/formatAmount";

import { SheetTooltip } from "@/components/shared/table/TableActionTooltip";
import { TableActionAlertDialog } from "@/components/shared/table/TableActionAlertDialog";
import { Product } from "@/services/products/types";
import { SkeletonColumn } from "@/types/skeleton";
import { HasPermission } from "@/hooks/use-authorization";

import { restoreProduct } from "@/actions/products/restoreProduct";
import { deleteProduct } from "@/actions/products/deleteProduct";
import { TransformedProduct } from "@/app/(dashboard)/products/_components/products-table/Table";

export const getColumns = ({
    hasPermission,
}: {
    hasPermission: HasPermission;
}) => {
    const columns: ColumnDef<TransformedProduct>[] = [
        /*
                {
                    id: "select",
                    header: ({ table }) => (
                        <Checkbox
                            checked={
                                table.getIsAllPageRowsSelected() ||
                                (table.getIsSomePageRowsSelected() && "indeterminate")
                            }
                            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                            aria-label="Select all"
                            className="translate-y-[2px]"
                        />
                    ),
                    cell: ({ row }) => (
                        <Checkbox
                            checked={row.getIsSelected()}
                            onCheckedChange={(value) => row.toggleSelected(!!value)}
                            aria-label="Select row"
                            className="translate-y-[2px]"
                        />
                    ),
                    enableSorting: false,
                    enableHiding: false,
                },
        */
        {
            header: "product name",
            cell: ({ row }) => {
                const product = row.original;
                const isVariant = product._isVariant;
                const variantData = product._variantData;

                return (
                    <div className="flex gap-2 items-center">

                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-muted-foreground">
                                {isVariant ? (
                                    <>
                                        {variantData?.name || variantData?.slug || `Variant ${product._variantIndex !== undefined ? product._variantIndex + 1 : 1}`}
                                    </>
                                ) : (
                                    product.name
                                )}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            header: "product type",
            cell: ({ row }) => (
                <Badge variant={row.original.product_type === "digital" ? "secondary" : "default"}>
                    {row.original.product_type === "digital" ? "Digital" : "Physical"}
                </Badge>
            ),
        },
        {
            header: "structure",
            cell: ({ row }) => {
                const isVariant = row.original._isVariant;
                return (
                    <Badge variant={isVariant ? "outline" : "secondary"}>
                        {isVariant ? "Variant" : "Simple"}
                    </Badge>
                );
            },
        },
        {
            header: "category",
            cell: ({ row }) => {
                const categoryNames = row.original.categories?.map(cat => cat.category?.name).filter(Boolean) || [];
                const displayName = categoryNames.length > 0 ? categoryNames.join(", ") : "—";
                return (
                    <Typography
                        className={cn(
                            "block max-w-52 truncate",
                            categoryNames.length === 0
                        )}
                    >
                        {displayName}
                    </Typography>
                );
            },
        },
        {
            header: "cost price",
            cell: ({ row }) => {
                return formatAmount(row.original.cost_price);
            },
        },
        {
            header: "sale price",
            cell: ({ row }) => {
                return formatAmount(row.original.selling_price);
            },
        },

        {
            header: "actions",
            cell: ({ row }) => {
                const product = row.original;
                const isVariant = product._isVariant;
                const variantData = product._variantData;
                const parentProduct = product._parentProduct;

                return (
                    <div className="flex items-center gap-1">
                        {hasPermission("products", "canEdit") && (
                            <TableActionAlertDialog
                                title={`Restore ${isVariant ? 'variant' : 'product'} "${product.name}"?`}
                                description={
                                    isVariant
                                        ? "This will restore this variant to the active products list."
                                        : "This will restore the product to the active products list."
                                }
                                tooltipContent={isVariant ? "Restore Variant" : "Restore Product"}
                                actionButtonText={isVariant ? "Restore Variant" : "Restore Product"}
                                toastSuccessMessage={`${isVariant ? 'Variant' : 'Product'} "${product.name}" restored successfully!`}
                                queryKey="products"
                                action={() => restoreProduct(parentProduct?._id || product._id, isVariant ? variantData?._id : undefined)}
                            >
                                <div className="text-primary hover:bg-primary/10 p-2 rounded-md transition-colors cursor-pointer">
                                    <ArchiveRestore className="size-5" />
                                </div>
                            </TableActionAlertDialog>
                        )}

                        {hasPermission("products", "canDelete") && (
                            <TableActionAlertDialog
                                title={`PERMANENTLY DELETE ${isVariant ? 'variant' : 'product'} "${product.name}"?`}
                                description={
                                    isVariant
                                        ? "This action CANNOT be undone. This will permanently remove this variant from the database."
                                        : "This action CANNOT be undone. This will permanently remove the product and all its history from the database."
                                }
                                tooltipContent={isVariant ? "Delete Variant Permanently" : "Delete Product Permanently"}
                                actionButtonText={isVariant ? "Delete Variant Permanently" : "Delete Product Permanently"}
                                toastSuccessMessage={`${isVariant ? 'Variant' : 'Product'} "${product.name}" deleted permanently!`}
                                queryKey="products"
                                action={() => deleteProduct(parentProduct?._id || product._id)}
                            >
                                <div className="text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors cursor-pointer">
                                    <Trash2 className="size-5" />
                                </div>
                            </TableActionAlertDialog>
                        )}
                    </div>
                );
            },
        },
    ];

    return columns;
};

export const skeletonColumns: SkeletonColumn[] = [
    {
        header: "select",
        cell: <Skeleton className="w-4 h-4 rounded-sm" />,
    },
    {
        header: "product name",
        cell: (
            <div className="flex gap-2 items-center">
                <Skeleton className="w-10 h-10 rounded-md" />
                <Skeleton className="w-48 h-8" />
            </div>
        ),
    },
    {
        header: "product type",
        cell: <Skeleton className="w-24 h-8" />,
    },
    {
        header: "structure",
        cell: <Skeleton className="w-20 h-8" />,
    },
    {
        header: "category",
        cell: <Skeleton className="w-32 h-8" />,
    },
    {
        header: "cost price",
        cell: <Skeleton className="w-20 h-8" />,
    },
    {
        header: "sale price",
        cell: <Skeleton className="w-20 h-8" />,
    },
    {
        header: "actions",
        cell: <Skeleton className="w-20 h-8" />,
    },
];
