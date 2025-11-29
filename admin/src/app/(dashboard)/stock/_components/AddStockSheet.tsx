"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { createStock } from "@/actions/stock";
import { serverAxiosInstance } from "@/helpers/axiosInstance";

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
const stockFormSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  minStock: z.number().min(0, "Minimum stock cannot be negative"),
  notes: z.string().optional(),
});

type StockFormData = z.infer<typeof stockFormSchema>;

// Type definitions
interface ProductVariant {
  _id: string;
  name: string;
  sku?: string;
  slug?: string;
  cost_price?: number;
  selling_price?: number;
  stock?: number;
  minStock?: number;
  status?: string;
  images?: string[];
  attributes?: Record<string, string>;
}

interface APIProduct {
  _id: string;
  name: string;
  slug: string;
  product_structure?: "simple" | "variant";
  image_url?: string[];
  product_variants?: ProductVariant[];
}

interface StockServerActionResponse {
  success?: boolean;
  stock?: any;
  validationErrors?: Record<string, string>;
  error?: string;
}

interface AddStockSheetProps {
  title?: string;
  description?: string;
  submitButtonText?: string;
  actionVerb?: string;
  children?: React.ReactNode;
  action?: (formData: FormData) => Promise<StockServerActionResponse>;
}

export function AddStockSheet({ 
  children,
  title = "Add Stock",
  description = "Add stock for an existing product in your inventory.",
  submitButtonText = "Add Stock",
  actionVerb = "added",
  action = async (formData: FormData) => {
    const productId = formData.get("productId") as string;
    const variantId = formData.get("variantId") as string | null;
    const quantity = parseInt(formData.get("quantity") as string);
    const minStock = parseInt(formData.get("minStock") as string);
    const notes = formData.get("notes") as string;

    const stockData = {
      productId,
      variantId: variantId || undefined,
      quantity,
      minStock,
      notes,
    };

    try {
      await createStock(stockData);
      return { success: true, stock: stockData };
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : "Failed to add stock" 
      };
    }
  }
}: AddStockSheetProps) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [variantSearchQuery, setVariantSearchQuery] = useState("");
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [showVariantSuggestions, setShowVariantSuggestions] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState("");
  const [selectedVariantName, setSelectedVariantName] = useState("");

  const form = useForm<StockFormData>({
    resolver: zodResolver(stockFormSchema),
    defaultValues: {
      productId: "",
      variantId: "",
      quantity: 1,
      minStock: 5,
      notes: "",
    },
  });

  // Fetch products with search query
  const { data: products = [], isLoading } = useQuery<APIProduct[]>({
    queryKey: ["products", productSearchQuery],
    queryFn: async () => {
      try {
        const { data } = await serverAxiosInstance.get<{ data: APIProduct[] }>(
          `/api/products?search=${productSearchQuery}&limit=50`
        );
        return data.data;
      } catch (error) {
        console.error("Error fetching products:", error);
        toast.error("Failed to load products");
        return [];
      }
    },
    enabled: isSheetOpen && productSearchQuery.length > 0,
    staleTime: 30000,
  });

  const selectedProductId = form.watch("productId");
  const selectedVariantId = form.watch("variantId");
  const selectedProduct = products.find(p => p._id === selectedProductId);
  
  const isVariantProduct = selectedProduct?.product_structure === "variant";
  const hasVariants = isVariantProduct && 
    selectedProduct?.product_variants && 
    selectedProduct.product_variants.length > 0;

  const selectedVariant = selectedProduct?.product_variants?.find(
    v => v._id === selectedVariantId
  );

  // Filter variants based on search
  const filteredVariants = selectedProduct?.product_variants?.filter(v => 
    v.name.toLowerCase().includes(variantSearchQuery.toLowerCase()) ||
    v.sku?.toLowerCase().includes(variantSearchQuery.toLowerCase()) ||
    Object.values(v.attributes || {}).some(attr => 
      attr.toLowerCase().includes(variantSearchQuery.toLowerCase())
    )
  ) || [];

  // Reset variantId when product changes
  useEffect(() => {
    if (selectedProductId) {
      form.setValue("variantId", "", {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false
      });
      setSelectedVariantName("");
      setVariantSearchQuery("");
    }
  }, [selectedProductId, form]);

  // Auto-fill minStock when variant is selected
  useEffect(() => {
    if (selectedVariant?.minStock !== undefined) {
      form.setValue("minStock", selectedVariant.minStock, {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false
      });
    }
  }, [selectedVariant, form]);

  const onSubmit = (data: StockFormData) => {
    console.log('=== STOCK FORM SUBMISSION ===');
    console.log('Form data:', data);

    if (isVariantProduct && !data.variantId) {
      toast.error("Please select a variant");
      form.setError("variantId", {
        message: "Variant is required for variant products"
      });
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("productId", data.productId);
        if (data.variantId) {
          formData.append("variantId", data.variantId);
        }
        formData.append("quantity", data.quantity.toString());
        formData.append("minStock", data.minStock.toString());
        if (data.notes) {
          formData.append("notes", data.notes);
        }

        const result = await action(formData);
        console.log('=== BACKEND RESPONSE ===', result);

        if (!result) {
          toast.error("No response received from server");
          return;
        }

        if ("validationErrors" in result && result.validationErrors) {
          console.log('Validation errors:', result.validationErrors);
          Object.keys(result.validationErrors).forEach((key) => {
            form.setError(key as keyof StockFormData, {
              message: result.validationErrors![key],
            });
          });

          form.setFocus(
            Object.keys(result.validationErrors)[0] as keyof StockFormData
          );
        } else if (result.success || "stock" in result) {
          console.log('Stock added successfully:', result.stock);
          
          const productName = isVariantProduct && selectedVariant 
            ? `${selectedProduct?.name} - ${selectedVariant.name}`
            : selectedProduct?.name;
          
          toast.success(
            `Stock ${actionVerb} successfully for ${productName}!`,
            { position: "top-center" }
          );

          form.reset({
            productId: "",
            variantId: "",
            quantity: 1,
            minStock: 5,
            notes: "",
          });

          setSelectedProductName("");
          setSelectedVariantName("");
          setProductSearchQuery("");
          setVariantSearchQuery("");

          queryClient.invalidateQueries({ queryKey: ["stocks"] });
          queryClient.invalidateQueries({ queryKey: ["products"] });
          
          setIsSheetOpen(false);
        } else if (result.error) {
          console.log('Error:', result.error);
          toast.error(result.error);
        } else {
          console.log('Unexpected response:', result);
          toast.error("Unexpected response from server");
        }
      } catch (error) {
        console.error('=== ACTION ERROR ===', error);
        const errorMessage = error instanceof Error ? error.message : "Failed to add stock";
        toast.error(errorMessage);
      }
    });
  };

  const onInvalid = (errors: FieldErrors<StockFormData>) => {
    console.log('=== FORM VALIDATION FAILED ===');
    console.log('Validation errors:', errors);
    console.log('Error fields:', Object.keys(errors));

    const firstErrorKey = Object.keys(errors)[0];
    const firstError = errors[firstErrorKey as keyof StockFormData];
    if (firstError && 'message' in firstError) {
      toast.error(`Validation error: ${firstError.message}`);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setProductSearchQuery("");
      setVariantSearchQuery("");
      setSelectedProductName("");
      setSelectedVariantName("");
      setShowProductSuggestions(false);
      setShowVariantSuggestions(false);
    }
    setIsSheetOpen(newOpen);
  };

  const handleProductSelect = (product: APIProduct) => {
    form.setValue("productId", product._id);
    setSelectedProductName(product.name);
    setProductSearchQuery(product.name);
    setShowProductSuggestions(false);
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    form.setValue("variantId", variant._id);
    setSelectedVariantName(variant.name);
    setVariantSearchQuery(variant.name);
    setShowVariantSuggestions(false);
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
                  <SheetDescription>{description}</SheetDescription>
                </div>
              </FormSheetHeader>

              <FormSheetBody>
                <div className="space-y-6">
                  {/* Product Search Input */}
                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product *</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="Type to search products..."
                              value={productSearchQuery}
                              onChange={(e) => {
                                setProductSearchQuery(e.target.value);
                                setShowProductSuggestions(true);
                                if (!e.target.value) {
                                  form.setValue("productId", "");
                                  setSelectedProductName("");
                                }
                              }}
                              onFocus={() => setShowProductSuggestions(true)}
                              className="w-full"
                            />
                          </FormControl>
                          
                          {/* Product Suggestions Dropdown */}
                          {showProductSuggestions && productSearchQuery.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-auto">
                              {isLoading ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                  <p className="mt-2">Loading products...</p>
                                </div>
                              ) : products.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  No products found
                                </div>
                              ) : (
                                <div className="py-2">
                                  {products.map((product) => (
                                    <div
                                      key={product._id}
                                      onClick={() => handleProductSelect(product)}
                                      className={cn(
                                        "px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors",
                                        product._id === field.value && "bg-gray-50"
                                      )}
                                    >
                                      <div className="flex items-center gap-3">
                                        {product.image_url?.[0] && (
                                          <img
                                            src={product.image_url[0]}
                                            alt={product.name}
                                            className="h-10 w-10 rounded-md object-cover flex-shrink-0"
                                          />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">{product.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {product.product_structure === "variant" 
                                              ? `${product.product_variants?.length || 0} variants` 
                                              : "Simple product"}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Variant Search Input */}
                  {isVariantProduct && hasVariants && (
                    <FormField
                      control={form.control}
                      name="variantId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variant *</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="Type to search variants..."
                                value={variantSearchQuery}
                                onChange={(e) => {
                                  setVariantSearchQuery(e.target.value);
                                  setShowVariantSuggestions(true);
                                  if (!e.target.value) {
                                    form.setValue("variantId", "");
                                    setSelectedVariantName("");
                                  }
                                }}
                                onFocus={() => setShowVariantSuggestions(true)}
                                className="w-full"
                              />
                            </FormControl>
                            
                            {/* Variant Suggestions Dropdown */}
                            {showVariantSuggestions && (
                              <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-auto">
                                {filteredVariants.length === 0 ? (
                                  <div className="p-4 text-center text-sm text-muted-foreground">
                                    No variants found
                                  </div>
                                ) : (
                                  <div className="py-2">
                                    {filteredVariants.map((variant) => (
                                      <div
                                        key={variant._id}
                                        onClick={() => handleVariantSelect(variant)}
                                        className={cn(
                                          "px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors",
                                          variant._id === field.value && "bg-gray-50"
                                        )}
                                      >
                                        <div className="flex items-center gap-3">
                                          {variant.images?.[0] && (
                                            <img
                                              src={variant.images[0]}
                                              alt={variant.name}
                                              className="h-10 w-10 rounded-md object-cover flex-shrink-0"
                                            />
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                              {variant.name || "Unnamed Variant"}
                                            </p>
                                            {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                                              <p className="text-xs text-muted-foreground truncate">
                                                {Object.entries(variant.attributes)
                                                  .map(([key, value]) => `${key}: ${value}`)
                                                  .join(", ")}
                                              </p>
                                            )}
                                            {variant.sku && (
                                              <p className="text-xs text-muted-foreground">
                                                SKU: {variant.sku}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Current Stock Info */}
                  {selectedVariant && (
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                      <h4 className="text-sm font-medium">Current Stock Information</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Current Stock:</span>
                          <span className="ml-2 font-medium">{selectedVariant.stock || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Min Stock:</span>
                          <span className="ml-2 font-medium">{selectedVariant.minStock || 0}</span>
                        </div>
                        {selectedVariant.selling_price && (
                          <div>
                            <span className="text-muted-foreground">Price:</span>
                            <span className="ml-2 font-medium">₹{selectedVariant.selling_price}</span>
                          </div>
                        )}
                        {selectedVariant.status && (
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <span className="ml-2 font-medium capitalize">{selectedVariant.status}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
                            placeholder="Enter quantity to add"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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