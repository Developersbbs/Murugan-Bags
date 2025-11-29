"use client";

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
import { toast } from "sonner";

import { TableSwitch } from "@/components/shared/table/TableSwitch";
import { SheetTooltip } from "@/components/shared/table/TableActionTooltip";
import { TableActionAlertDialog } from "@/components/shared/table/TableActionAlertDialog";
import { EditProductSheet } from "../../[slug]/_components/EditProductSheet";
import { ProductBadgeVariants } from "@/constants/badge";
import { Product } from "@/services/products/types";
import { SkeletonColumn } from "@/types/skeleton";
import { ServerActionResponse } from "@/types/server-action";

import { editProduct } from "@/actions/products/editProduct";
import { deleteProduct } from "@/actions/products/deleteProduct";
import { toggleProductPublishedStatus } from "@/actions/products/toggleProductStatus";
import { HasPermission } from "@/hooks/use-authorization";

// Type for transformed product data (includes variants as separate rows)
type TransformedProduct = Product & {
  _isVariant?: boolean;
  _variantIndex?: number;
  _variantData?: any;
  _originalProductId?: string;
  _parentProduct?: Product;
};

// Transform products data to show variants as separate rows
function transformProductsForTable(products: Product[]): TransformedProduct[] {
  const transformedProducts: TransformedProduct[] = [];

  products.forEach(product => {
    if (product.product_variants && product.product_variants.length > 0) {
      // For variant products, create separate rows for each variant
      product.product_variants.forEach((variant, index) => {
        transformedProducts.push({
          ...product,
          _isVariant: true,
          _variantIndex: index,
          _variantData: variant,
          _originalProductId: product._id,
          // Override product fields with variant-specific data
          name: `${product.name} - ${variant.name || variant.slug}`,
          slug: variant.slug,
          sku: variant.sku,
          cost_price: variant.cost_price,
          selling_price: variant.selling_price,
          baseStock: variant.stock,
          minStock: variant.minStock,
          status: variant.status,
          published: variant.published,
          image_url: variant.images || product.image_url,
          // Keep reference to parent product for actions
          _parentProduct: product,
        } as TransformedProduct);
      });
    } else {
      // For simple products, add as-is
      transformedProducts.push({
        ...product,
        _isVariant: false,
        _variantIndex: 0,
      } as TransformedProduct);
    }
  });

  return transformedProducts;
}

export const getColumns = ({
  hasPermission,
}: {
  hasPermission: HasPermission;
}) => {
  const columns: ColumnDef<TransformedProduct>[] = [
    {
      header: "product name",
      cell: ({ row }) => {
        const product = row.original;
        const isVariant = product._isVariant;
        const variantData = product._variantData;
        const parentProduct = product._parentProduct;

        return (
          <div className="flex gap-2 items-center">
            
            <div className="flex flex-col">
              <Link
                href={`/products/${parentProduct?.slug || product.slug}${isVariant && variantData ? `?variant=${variantData.slug}` : ''}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                {isVariant ? (
                  <>
                    {variantData?.name || variantData?.slug || `Variant ${product._variantIndex !== undefined ? product._variantIndex + 1 : 1}`}
                    {/* {variantData?.attributes && Object.keys(variantData.attributes).length > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({Object.entries(variantData.attributes).map(([key, value]) => `${key}: ${value}`).join(', ')})
                      </span>
                    )} */}
                  </>
                ) : (
                  product.name
                )}
              </Link>

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
      header: "status",
      cell: ({ row }) => {
        const status = row.original.status || 'draft';
        const variantMap: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
          'selling': 'default',
          'out_of_stock': 'destructive',
          'draft': 'outline',
          'archived': 'secondary'
        };
        
        const statusLabels: Record<string, string> = {
          'selling': 'Selling',
          'out_of_stock': 'Out of Stock',
          'draft': 'Draft',
          'archived': 'Archived'
        };

        return (
          <Badge variant={variantMap[status] || 'outline'}>
            {statusLabels[status] || status}
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
      header: "view",
      cell: ({ row }) => {
        const product = row.original;
        const isVariant = product._isVariant;
        const variantData = product._variantData;
        const parentProduct = product._parentProduct;

        return (
          <Button size="icon" asChild variant="ghost" className="text-foreground">
            <Link href={`/products/${parentProduct?.slug || product.slug}${isVariant && variantData ? `?variant=${variantData.slug}` : ''}`}>
              <ZoomIn className="size-5" />
            </Link>
          </Button>
        );
      },
    },
  ];

  if (hasPermission("products", "canTogglePublished")) {
    columns.splice(7, 0, {
      header: "published",
      cell: ({ row }: { row: any }) => {
        const product = row.original;
        const isVariant = product._isVariant;
        const variantData = product._variantData;
        const parentProduct = product._parentProduct;

        // For variants, check variant's published status
        // For simple products, check product's published status
        const isPublished = isVariant ? variantData?.published : product.published;

        // Stock information for the specific variant or product
        const stockInfo = isVariant
          ? {
              baseStock: variantData?.stock || 0,
              minStock: variantData?.minStock || 0,
            }
          : {
              baseStock: product.baseStock || 0,
              minStock: product.minStock || 0,
            };

        const handleToggle = async (): Promise<ServerActionResponse> => {
          try {
            // Get the parent product ID for variants or use the product ID for simple products
            const targetId = parentProduct?._id || product._id;
            
            // For variants, include the variant ID in the request
            const variantId = isVariant && variantData?._id ? variantData._id.toString() : undefined;
            
            // Call the toggle function
            const result = await toggleProductPublishedStatus(
              targetId, 
              isPublished,
              variantId // Pass variantId if this is a variant
            );
            
            // Check if the response has a success property
            if ('success' in result && result.success) {
              // Show success message
              toast.success(
                isVariant 
                  ? `✅ Variant ${!isPublished ? 'published' : 'unpublished'} successfully`
                  : `✅ Product ${!isPublished ? 'published' : 'unpublished'} successfully`,
                { position: "top-center" }
              );
              
              // Manually update the UI by toggling the published state
              if (isVariant && variantData) {
                variantData.published = !isPublished;
              } else {
                product.published = !isPublished;
              }
              
              // Force a re-render by updating the row data
              row.original = { ...row.original };
              
              return { success: true };
            } 
            
            // Handle error cases
            if ('dbError' in result) {
              toast.error(result.dbError, { position: "top-center" });
              return { success: false, dbError: result.dbError };
            }
            
            if ('validationErrors' in result) {
              const errorMessage = Object.values(result.validationErrors).join(' ');
              toast.error(errorMessage, { position: "top-center" });
              return { success: false, dbError: errorMessage };
            }
            
            // Default error response
            return { success: false, dbError: 'An unknown error occurred' };
            
          } catch (error) {
            console.error('Toggle failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update status';
            toast.error(errorMessage, { position: "top-center" });
            return { success: false, dbError: errorMessage };
          }
        };

        return (
          <div className="pl-5">
            <TableSwitch
              checked={isPublished}
              toastSuccessMessage={
                isVariant
                  ? `✅ Variant ${isPublished ? 'unpublished' : 'published'}. Stock: ${stockInfo.baseStock} / Min: ${stockInfo.minStock}.`
                  : `✅ Product ${isPublished ? 'unpublished' : 'published'}. Stock: ${stockInfo.baseStock} / Min: ${stockInfo.minStock}.`
              }
              queryKey="products"
              onCheckedChange={handleToggle}
            />

          </div>
        );
      },
    });
  }

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

    columns.splice(9, 0, {
      header: "actions",
      cell: ({ row }) => {
        const product = row.original;
        const isVariant = product._isVariant;
        const variantData = product._variantData;
        const parentProduct = product._parentProduct;

        return (
          <div className="flex items-center gap-1">
            {hasPermission("products", "canEdit") && (
              <EditProductSheet product={parentProduct || product}>
                <SheetTooltip content={isVariant ? "Edit Parent Product" : "Edit Product"}>
                  <PenSquare className="size-5" />
                </SheetTooltip>
              </EditProductSheet>
            )}

            {hasPermission("products", "canDelete") && (
              <TableActionAlertDialog
                title={`Delete ${isVariant ? 'variant' : 'product'} "${product.name}"?`}
                description={
                  isVariant
                    ? "This will delete this specific variant. The parent product and other variants will remain."
                    : "This action cannot be undone. This will permanently delete the product and its associated data from the database."
                }
                tooltipContent={isVariant ? "Delete Variant" : "Delete Product"}
                actionButtonText={isVariant ? "Delete Variant" : "Delete Product"}
                toastSuccessMessage={`${isVariant ? 'Variant' : 'Product'} "${product.name}" deleted successfully!`}
                queryKey="products"
                action={() => deleteProduct(parentProduct?._id || product._id)}
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

// Export the transform function for use in parent components
export { transformProductsForTable };

export const skeletonColumns: SkeletonColumn[] = [
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
    header: "view",
    cell: <Skeleton className="w-8 h-8" />,
  },
  {
    header: "published",
    cell: <Skeleton className="w-16 h-10" />,
  },
  {
    header: "actions",
    cell: <Skeleton className="w-20 h-8" />,
  },
];
