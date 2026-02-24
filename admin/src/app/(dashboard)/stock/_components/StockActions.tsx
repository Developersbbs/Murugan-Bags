"use client";

import { PenSquare, Trash2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SheetTrigger } from "@/components/ui/sheet";
import { ActionAlertDialog } from "@/components/shared/ActionAlertDialog";
import { ExportDataButtons } from "@/components/shared/ExportDataButtons";

import { bulkUpdateStock, deleteStock, exportStock } from "@/actions/stock";
import { RowSelectionProps } from "@/types/data-table";
import { useAuthorization } from "@/hooks/use-authorization";
import { AddStockSheet } from "./AddStockSheet";

export default function StockActions({
  rowSelection,
  setRowSelection,
  stock = [], // Add stock data as prop
}: RowSelectionProps & { stock?: any[] }) {
  const { hasPermission } = useAuthorization();

  // Helper function to get actual stock IDs from row selection
  const getSelectedStockIds = () => {
    return Object.keys(rowSelection)
      .map(index => {
        const stockIndex = parseInt(index);
        return stock?.[stockIndex]?._id || stock?.[stockIndex]?.id;
      })
      .filter(Boolean);
  };

  return (
    <Card className="mb-5">
      <div className="flex flex-col xl:flex-row xl:justify-between gap-4">
        <ExportDataButtons action={exportStock} tableName="stock" hideJson={true} />

        {(hasPermission("products", "canEdit") ||
          hasPermission("products", "canDelete") ||
          hasPermission("products", "canCreate")) && (
            <div className="flex flex-col sm:flex-row gap-4">


              {hasPermission("products", "canDelete") && (
                <ActionAlertDialog
                  title={`Delete ${Object.keys(rowSelection).length} stock entries?`}
                  description="This action cannot be undone. This will permanently delete the stock entries."
                  actionButtonText="Delete Stock"
                  toastSuccessMessage="Stock entries deleted successfully"
                  queryKey="products"
                  action={async () => {
                    const selectedIds = getSelectedStockIds();
                    const results = await Promise.all(selectedIds.map(id => deleteStock(id)));
                    // Return the first successful result or throw if all failed
                    const successResult = results.find(result => "success" in result);
                    if (successResult) {
                      return successResult;
                    }
                    throw new Error("Failed to delete stock entries");
                  }}
                  onSuccess={() => setRowSelection({})}
                >
                  <Button
                    variant="destructive"
                    size="lg"
                    type="button"
                    disabled={!Boolean(Object.keys(rowSelection).length)}
                    className="sm:flex-grow xl:flex-grow-0 transition-opacity duration-300"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </Button>
                </ActionAlertDialog>
              )}
              {hasPermission("products", "canCreate") && (
                <AddStockSheet
                  title="Add Stock"
                  description="Add necessary product information here"
                  submitButtonText="Add Stock"
                  actionVerb="added"
                >
                  <SheetTrigger asChild>
                    <Button
                      variant="default"
                      size="lg"
                      className="sm:flex-grow xl:flex-grow-0"
                    >
                      <Plus className="mr-2 size-4" /> Add Stock
                    </Button>
                  </SheetTrigger>
                </AddStockSheet>
              )}

            </div>
          )}
      </div>
    </Card>
  );
}
