import Link from "next/link";
import { ZoomIn, PenSquare, Trash2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Typography from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/helpers/formatAmount";

import { SheetTooltip } from "@/components/shared/table/TableActionTooltip";
import { EditStockSheet } from "../EditStockSheet";
import { Stock } from "@/actions/stock";
import { SkeletonColumn } from "@/types/skeleton";

import { deleteStock } from "@/actions/stock";
import { HasPermission } from "@/hooks/use-authorization";
import { TableActionAlertDialog } from "@/components/shared/table/TableActionAlertDialog";

export const getColumns = ({
  hasPermission,
}: {
  hasPermission: HasPermission;
}) => {
  const columns: ColumnDef<Stock>[] = [
    {
      header: "product",
      cell: ({ row }) => {
        const isVariantStock = row.original.variantId && row.original.productId && 
          (row.original.productId.product_variants || (row.original.productId as any).product_variants);
        const currentVariant = isVariantStock
          ? (row.original.productId.product_variants || (row.original.productId as any).product_variants)?.find((v: any) => v._id === row.original.variantId)
          : null;

        // Determine which image to use
        const imageUrl = (() => {
          if (isVariantStock && currentVariant && row.original.productId) {
            // For variants, check both 'images' and 'image_url' fields
            const variantImages = (currentVariant as any).images || currentVariant.image_url;
            if (variantImages && variantImages.length > 0) {
              return variantImages[0];
            }
          }
          // For main products, check image_url field
          if (row.original.productId && row.original.productId.image_url && row.original.productId.image_url.length > 0) {
            return row.original.productId.image_url[0];
          }
          return null;
        })();

        // Determine which name to display
        const displayName = isVariantStock && currentVariant?.name
          ? currentVariant.name
          : row.original.productId?.name || 'Unknown Product';

        // Determine which SKU to display
        const displaySku = isVariantStock && currentVariant?.sku
          ? currentVariant.sku
          : row.original.productId?.sku || 'Unknown SKU';

        return (
          <div className="flex gap-2 items-center">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={displayName}
                className="w-10 h-10 object-cover rounded-md"
              />
            )}
            <div className="flex flex-col">
              <Typography className="capitalize block truncate">
                {displayName}
              </Typography>
              <Typography className="text-sm text-muted-foreground">
                SKU: {displaySku}
              </Typography>
              {isVariantStock && currentVariant?.attributes && Object.keys(currentVariant.attributes).length > 0 && (
                <Typography className="text-xs text-muted-foreground">
                  ({Object.entries(currentVariant.attributes).map(([key, value]) => `${key}: ${value}`).join(', ')})
                </Typography>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "quantity",
      cell: ({ row }) => {
        const quantity = row.original.quantity;
        const isLowStock = quantity !== null && quantity !== undefined && quantity <= row.original.minStock;
        const minStock = row.original.minStock;
        const notes = row.original.notes;
        
        // Parse notes to extract original quantity if available
        let originalQuantity = null;
        if (notes && notes.includes('Updated via order dispatch:')) {
          const match = notes.match(/(\d+) → (\d+)/);
          if (match) {
            originalQuantity = parseInt(match[1]);
          }
        }
        
        return (
          <div className="flex flex-col items-start">
            <Typography className={cn(
              "font-medium",
              isLowStock && "text-destructive"
            )}>
              {quantity !== null && quantity !== undefined ? quantity : 'NA'}
            </Typography>
            
            {/* Show original quantity if available */}
            {originalQuantity !== null && originalQuantity !== quantity && (
              <Typography className="text-xs text-muted-foreground">
                Original: {originalQuantity}
              </Typography>
            )}
            
            {/* Show change indicator */}
            {originalQuantity !== null && originalQuantity !== quantity && (
              <Typography className={cn(
                "text-xs",
                quantity < originalQuantity ? "text-orange-600" : "text-green-600"
              )}>
                {quantity < originalQuantity ? `↓ -${originalQuantity - quantity}` : `↑ +${quantity - originalQuantity}`}
              </Typography>
            )}
            
            {isLowStock && (
              <Badge variant="destructive" className="text-xs mt-1">
                Low Stock
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      header: "min stock",
      cell: ({ row }) => (
        <Typography>{row.original.minStock !== null && row.original.minStock !== undefined ? row.original.minStock : 'NA'}</Typography>
      ),
    },
    {
      header: "last updated",
      cell: ({ row }) => {
        const date = new Date(row.original.updated_at);
        return (
          <Typography className="text-sm">
            {date.toLocaleDateString()}
          </Typography>
        );
      },
    },
    {
      header: "notes",
      cell: ({ row }) => {
        const notes = row.original.notes;
        return (
          <div className="max-w-xs" title={notes}>
            <Typography className="text-xs text-muted-foreground truncate">
              {notes || '-'}
            </Typography>
          </div>
        );
      },
    },
  ];

  if (
    hasPermission("products", "canDelete") ||
    hasPermission("products", "canEdit")
  ) {
    columns.splice(0, 0, {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
    });

    columns.push({
      header: "actions",
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-1">
            {hasPermission("products", "canEdit") && (
              <EditStockSheet stock={row.original}>
                <SheetTooltip content="Edit Stock">
                  <PenSquare className="size-5" />
                </SheetTooltip>
              </EditStockSheet>
            )}

            {hasPermission("products", "canDelete") && (
              <TableActionAlertDialog
                title={`Delete stock entry?`}
                description="This action cannot be undone. This will permanently delete the stock entry."
                tooltipContent="Delete Stock"
                actionButtonText="Delete Stock"
                toastSuccessMessage="Stock entry deleted successfully!"
                queryKey="stock"
                action={() => deleteStock(row.original._id)}
              >
                <Trash2 className="size-5" />
              </TableActionAlertDialog>
            )}
          </div>
        );
      },
    });
  }

  return columns;
};

export const skeletonColumns: SkeletonColumn[] = [
  {
    header: "product",
    cell: (
      <div className="flex gap-2 items-center">
        <Skeleton className="w-10 h-10 rounded-md" />
        <div className="flex flex-col gap-2">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-20 h-3" />
          <Skeleton className="w-24 h-3" />
        </div>
      </div>
    ),
  },
  {
    header: "quantity",
    cell: <Skeleton className="w-16 h-6" />,
  },
  {
    header: "min stock",
    cell: <Skeleton className="w-16 h-6" />,
  },
  {
    header: "last updated",
    cell: <Skeleton className="w-20 h-4" />,
  },
  {
    header: "actions",
    cell: <Skeleton className="w-20 h-8" />,
  },
];
