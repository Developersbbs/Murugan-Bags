"use client";

import { Archive, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SheetTrigger } from "@/components/ui/sheet";
import { ActionAlertDialog } from "@/components/shared/ActionAlertDialog";
import { ExportDataButtons } from "@/components/shared/ExportDataButtons";
import { ImportCSVButton } from "@/components/shared/ImportCSVButton";

import ProductFormSheet from "./form/ProductFormSheet";

import { addProduct } from "@/actions/products/addProduct";
import { bulkArchiveProducts } from "@/actions/products/bulkArchiveProducts";
import { exportProducts } from "@/actions/products/exportProducts";
import { RowSelectionProps } from "@/types/data-table";
import { useAuthorization } from "@/hooks/use-authorization";

export default function ProductActions({
  rowSelection,
  setRowSelection,
  products = [], // Add products data as prop
}: RowSelectionProps & { products?: any[] }) {
  const { hasPermission } = useAuthorization();

  // Helper function to get actual product IDs from row selection
  const getSelectedProductIds = () => {
    return Object.entries(rowSelection)
      .filter(([index, isSelected]) => isSelected) // Only get actually selected rows
      .map(([index]) => {
        const productIndex = parseInt(index);
        return products?.[productIndex]?._id || products?.[productIndex]?.id;
      })
      .filter(Boolean);
  };

  return (
    <Card className="mb-5">
      <div className="flex flex-col xl:flex-row xl:justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <ExportDataButtons action={exportProducts} tableName="products" hideJson={true} />
          <ImportCSVButton tableName="products" />
        </div>

        {(hasPermission("products", "canEdit") ||
          hasPermission("products", "canDelete") ||
          hasPermission("products", "canCreate")) && (
            <div className="flex flex-col sm:flex-row gap-4">


              {hasPermission("products", "canDelete") && (
                <ActionAlertDialog
                  title={`Archive ${Object.keys(rowSelection).length} products?`}
                  description="These products will be moved to the Archives page. You can restore them later."
                  actionButtonText="Archive Products"
                  toastSuccessMessage="Products archived successfully"
                  queryKey="products"
                  action={() => bulkArchiveProducts(getSelectedProductIds())}
                  onSuccess={() => setRowSelection({})}
                >
                  <Button
                    variant="destructive"
                    size="lg"
                    type="button"
                    disabled={!Boolean(Object.keys(rowSelection).length)}
                    className="sm:flex-grow xl:flex-grow-0 transition-opacity duration-300"
                  >
                    <Archive className="mr-2 size-4" />
                    Archive Selected
                  </Button>
                </ActionAlertDialog>
              )}

              {hasPermission("products", "canCreate") && (
                <ProductFormSheet
                  title="Add Product"
                  description="Add necessary product information here"
                  submitButtonText="Add Product"
                  actionVerb="added"
                  action={addProduct}
                >
                  <SheetTrigger asChild>
                    <Button
                      variant="default"
                      size="lg"
                      className="sm:flex-grow xl:flex-grow-0"
                    >
                      <Plus className="mr-2 size-4" /> Add Product
                    </Button>
                  </SheetTrigger>
                </ProductFormSheet>
              )}
            </div>
          )}
      </div>
    </Card>
  );
}
