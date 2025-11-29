"use client";

import { useState, useTransition } from "react";
import { useForm, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { updateStock, Stock } from "@/actions/stock";

// Form sheet components
const FormSheetContent = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col size-full bg-background">{children}</div>
);

const FormSheetBody = ({ children }: { children: React.ReactNode }) => (
  <ScrollArea className="flex-1">
    <div className="p-6 sm:p-10">{children}</div>
  </ScrollArea>
);

const FormSheetHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="flex-shrink-0 text-left bg-popover p-6 border-b">
    {children}
  </div>
);

const FormSheetFooter = ({ children }: { children: React.ReactNode }) => (
  <div className="flex-shrink-0 bg-popover border-t p-4 sm:p-6">
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
      {children}
    </div>
  </div>
);

// Zod schema for validation
const editStockFormSchema = z.object({
  quantity: z.number().min(1, "Quantity must be at least 1"),
  minStock: z.number().min(0, "Minimum stock cannot be negative"),
  notes: z.string().optional(),
});

type EditStockFormData = z.infer<typeof editStockFormSchema>;

interface EditStockServerActionResponse {
  success?: boolean;
  stock?: any;
  validationErrors?: Record<string, string>;
  error?: string;
}

interface EditStockSheetProps {
  stock: Stock;
  children: React.ReactNode;
  title?: string;
  description?: string;
  submitButtonText?: string;
  actionVerb?: string;
}

export function EditStockSheet({
  stock,
  children,
  title = "Edit Stock Entry",
  description,
  submitButtonText = "Update Stock",
  actionVerb = "updated",
}: EditStockSheetProps) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [isSheetOpen, setIsSheetOpen] = useState(false);


  const form = useForm<EditStockFormData>({
    resolver: zodResolver(editStockFormSchema),
    defaultValues: {
      quantity: stock.quantity,
      minStock: stock.minStock,
      notes: stock.notes || "",
    },
  });

  const onSubmit = (data: EditStockFormData) => {
    console.log("=== EDIT STOCK FORM SUBMISSION ===");
    console.log("Form data:", data);

    startTransition(async () => {
      try {
        const result = await updateStock(stock._id, data);
        console.log("=== BACKEND RESPONSE ===", result);

        if (!result) {
          toast.error("No response received from server");
          return;
        }

        if ("validationErrors" in result && result.validationErrors) {
          console.log("Validation errors:", result.validationErrors);
          Object.keys(result.validationErrors).forEach((key) => {
            form.setError(key as keyof EditStockFormData, {
              message: result.validationErrors![key],
            });
          });

          form.setFocus(
            Object.keys(result.validationErrors)[0] as keyof EditStockFormData
          );
        } else if (result.success || "stock" in result) {
          console.log("Stock updated successfully:", result.stock);

          const productName = stock.variantId
            ? `${stock.productId.name} - ${stock.variantId.name}`
            : stock.productId.name;

          toast.success(
            `Stock ${actionVerb} successfully for ${productName}!`,
            { position: "top-center" }
          );

          queryClient.invalidateQueries({ queryKey: ["stocks"] });
          queryClient.invalidateQueries({ queryKey: ["stock"] });
          queryClient.invalidateQueries({ queryKey: ["products"] });

          setIsSheetOpen(false);
        } else if (result.error) {
          console.log("Error:", result.error);
          toast.error(result.error);
        } else {
          console.log("Unexpected response:", result);
          toast.error("Unexpected response from server");
        }
      } catch (error) {
        console.error("=== ACTION ERROR ===", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to update stock";
        toast.error(errorMessage);
      }
    });
  };

  const onInvalid = (errors: FieldErrors<EditStockFormData>) => {
    console.log("=== FORM VALIDATION FAILED ===");
    console.log("Validation errors:", errors);
    console.log("Error fields:", Object.keys(errors));

    const firstErrorKey = Object.keys(errors)[0];
    const firstError = errors[firstErrorKey as keyof EditStockFormData];
    if (firstError && "message" in firstError) {
      toast.error(`Validation error: ${firstError.message}`);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    setIsSheetOpen(newOpen);
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={handleOpenChange}>
      {children}

      <SheetContent className="w-[90%] max-w-5xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onInvalid)}
            className="size-full"
          >
            <FormSheetContent>
              <FormSheetHeader>
                <div className="flex flex-col">
                  <SheetTitle>{title}</SheetTitle>
                  
                </div>
              </FormSheetHeader>

              <FormSheetBody>
                <div className="space-y-6">
                  {/* Current Stock Info */}
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <h4 className="text-sm font-medium">
                      Current Stock Information
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Current Stock:
                        </span>
                        <span className="ml-2 font-medium">
                          {stock.variantId?.stock || stock.quantity || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Min Stock:
                        </span>
                        <span className="ml-2 font-medium">
                          {stock.variantId?.minStock || stock.minStock || 0}
                        </span>
                      </div>
                      {stock.variantId?.selling_price && (
                        <div>
                          <span className="text-muted-foreground">Price:</span>
                          <span className="ml-2 font-medium">
                            ₹{stock.variantId.selling_price}
                          </span>
                        </div>
                      )}
                      {stock.variantId?.status && (
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <span className="ml-2 font-medium capitalize">
                            {stock.variantId.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity */}
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Enter quantity"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Minimum Stock */}
                  <FormField
                    control={form.control}
                    name="minStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Stock Threshold *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Enter minimum stock threshold"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Add any notes about this stock update"
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </FormSheetBody>

              <FormSheetFooter>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full"
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {submitButtonText}
                </Button>
              </FormSheetFooter>
            </FormSheetContent>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}