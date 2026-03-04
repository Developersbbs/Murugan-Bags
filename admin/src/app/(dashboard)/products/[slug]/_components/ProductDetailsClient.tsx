"use client";

import { useState, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Edit3, 
  Package, 
  FileText, 
  Layers, 
  Search,
  Tag,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Archive,
  Download,
  AlertTriangle,
} from "lucide-react";
import { EditProductSheet } from "./EditProductSheet";
import { ProductDetails } from "@/types/api";
import { getStockStatus, getStockDisplayText } from "@/utils/stockStatus";

type ProductDetailsClientProps = {
  product: ProductDetails;
};

// ─── Stock data shape injected by the backend API ────────────────────────────
// The product API route should merge Stock collection data before responding:
//
  // Simple product:
  //   product.stock_data = { quantity, minStock, reserved?, location? }

  // Variant product (each variant):
  //   product.product_variants[n].stock_data = { quantity, minStock, ... }
//
// Fallback chain (freshest → stale):
//   1. stock_data.quantity  ← injected by API from Stock collection  ✅ primary
//   2. variant.stock / product.baseStock ← synced by syncProductWithStock
//   3. 0
type StockData = {
  quantity: number;
  minStock: number;
  reserved?: number;
  location?: string;
};

function resolveStock(
  product: any,
  activeVariant: any | null
): { stock: number; minStock: number; stockData: StockData | null } {
  // ✅ Your backend (routes/products.js GET /:id and GET /slug/:slug) already
  //    fetches live stock from the Stock collection and writes it directly onto:
  //      - variant.stock + variant.minStock   (for variant products)
  //      - product.baseStock + product.minStock (for simple products)
  //    So we read those fields directly — no stock_data wrapper needed.
  if (activeVariant) {
    return {
      stock:     activeVariant.stock    ?? 0,
      minStock:  activeVariant.minStock ?? 0,
      stockData: null,
    };
  }
  return {
    stock:     (product as any).baseStock ?? 0,
    minStock:  (product as any).minStock  ?? 0,
    stockData: null,
  };
}

// ─── Image gallery (unchanged) ───────────────────────────────────────────────
const ProductImageGallery = memo(({ product, displayImages, displayName }: {
  product: any; displayImages: string[]; displayName: string;
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const images = displayImages.length > 0 ? displayImages : product.image_url || [];

  return (
    <div className="w-full">
      {images.length > 0 ? (
        <div className="space-y-3">
          <div className="aspect-square w-full bg-white rounded-lg border border-gray-200 overflow-hidden">
            <Image
              src={images[selectedImageIndex]}
              alt={`${displayName || "Product"} - Main`}
              width={400} height={400}
              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
              priority={selectedImageIndex === 0}
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((image: string, index: number) => (
                <button
                  key={index}
                  className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                    selectedImageIndex === index
                      ? "border-blue-600 ring-2 ring-blue-100"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <Image src={image} alt={`Thumbnail ${index + 1}`} width={64} height={64} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-square w-full bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
          <Package className="w-16 h-16 text-gray-300" />
        </div>
      )}
    </div>
  );
});
ProductImageGallery.displayName = "ProductImageGallery";

// ─── Stock Banner ─────────────────────────────────────────────────────────────
// Shown at the top of the page so stock status is immediately visible.
function StockBanner({ stock, minStock, productName }: {
  stock: number; minStock: number; productName: string;
}) {
  if (stock <= 0) {
    return (
      <div className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-lg px-5 py-4 mb-6">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-800">Out of Stock</p>
          <p className="text-xs text-red-600 mt-0.5">
            <span className="font-bold">{productName}</span> has 0 units remaining. Restock immediately to resume sales.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-3xl font-bold text-red-700">0</span>
          <p className="text-xs text-red-400">units</p>
        </div>
      </div>
    );
  }

  if (stock <= minStock) {
    return (
      <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 mb-6">
        <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">Low Stock Warning</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Only <span className="font-bold">{stock} units</span> remaining — below the minimum threshold of {minStock}.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-3xl font-bold text-amber-700">{stock}</span>
          <p className="text-xs text-amber-400">units left</p>
        </div>
      </div>
    );
  }

  // return (
  //   <div className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-lg px-5 py-4 mb-6">
  //     <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
  //     <div className="flex-1 min-w-0">
  //       <p className="text-sm font-semibold text-green-800">In Stock</p>
  //       <p className="text-xs text-green-600 mt-0.5">
  //         <span className="font-bold">{stock} units</span> available
  //         {minStock > 0 && ` · Minimum threshold: ${minStock} units`}
  //       </p>
  //     </div>
  //     <div className="text-right flex-shrink-0">
  //       <span className="text-3xl font-bold text-green-700">{stock}</span>
  //       <p className="text-xs text-green-400">units</p>
  //     </div>
  //   </div>
  // );
}

// ─── Shared Inventory Card Content ───────────────────────────────────────────
// Reused in both Overview and Details tabs.
function InventoryCardContent({ stock, minStock, stockData, stockStatusInfo }: {
  stock: number;
  minStock: number;
  stockData: StockData | null;
  stockStatusInfo: ReturnType<typeof getStockStatus>;
}) {
  const pct =
    minStock > 0
      ? Math.min((stock / (minStock * 2)) * 100, 100)
      : stock > 0 ? 50 : 0;

  const isOut  = stock <= 0;
  const isLow  = !isOut && stock <= minStock;

  const barColor = isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-green-500";
  const barBg    = isOut ? "bg-red-100"  : isLow ? "bg-amber-100"  : "bg-green-100";
  const textCls  = isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-gray-900";

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-baseline">
        <span className="text-sm text-gray-600">Current Stock</span>
        <span className={`text-xl font-bold ${textCls}`}>
          {stock}
          <span className="text-sm font-normal text-gray-400 ml-1">units</span>
        </span>
      </div>

      <div className="flex justify-between items-baseline">
        <span className="text-sm text-gray-600">Min. Threshold</span>
        <span className="text-base text-gray-700">{minStock} units</span>
      </div>

      {stockData?.reserved !== undefined && (
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-gray-600">Reserved</span>
          <span className="text-base text-gray-700">{stockData.reserved} units</span>
        </div>
      )}

      {stockData?.location && (
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-gray-600">Location</span>
          <span className="text-base text-gray-700">{stockData.location}</span>
        </div>
      )}

      <Separator />

      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Status</span>
          <span className={`font-semibold ${textCls}`}>
            {isOut ? "Out of Stock" : isLow ? `Low Stock · ${stock} left` : stockStatusInfo.label}
          </span>
        </div>
        <div className={`h-2.5 rounded-full ${barBg}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.max(pct, stock > 0 ? 3 : 0)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>0</span>
          {minStock > 0 && <span>Min: {minStock}</span>}
          {minStock > 0 && <span>Target: {minStock * 2}+</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProductDetailsClient({ product }: ProductDetailsClientProps) {
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Product not found</p>
        </div>
      </div>
    );
  }

  const router      = useRouter();
  const searchParams = useSearchParams();
  const variantSlug  = searchParams.get("variant");

  const selectedVariant =
    variantSlug && product.product_variants
      ? product.product_variants.find((v: any) => v.slug === variantSlug)
      : null;

  const defaultVariant =
    !selectedVariant &&
    product.product_structure === "variant" &&
    product.product_variants?.length > 0
      ? product.product_variants[0]
      : null;

  const activeVariant     = selectedVariant || defaultVariant || null;
  const safeCurrentProduct = activeVariant   || product;

  const displayImages =
    safeCurrentProduct.image_url?.length > 0
      ? safeCurrentProduct.image_url
      : product?.image_url ?? [];

  const displayName = safeCurrentProduct.name || product?.name || "Unnamed Product";

  // ✅ THE FIX: resolve live stock.
  //    Reads from stock_data (injected by API) → falls back to synced product fields
  const { stock: currentStock, minStock: currentMinStock, stockData } =
    resolveStock(product, activeVariant);

  const stockStatusInfo = getStockStatus(currentStock, product?.published, false);

  const profitMargin =
    safeCurrentProduct.cost_price && safeCurrentProduct.selling_price
      ? (
          ((safeCurrentProduct.selling_price - safeCurrentProduct.cost_price) /
            safeCurrentProduct.selling_price) * 100
        ).toFixed(1)
      : "0";

  const isPhysical = product.product_type !== "digital";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost" size="sm"
              className="gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => router.push("/products")}
            >
              <ArrowLeft className="w-4 h-4" />Back
            </Button>
            <div className="h-4 w-px bg-gray-300" />
            <span className="text-sm text-gray-500">Product Details</span>
          </div>
          <EditProductSheet product={product}>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Edit3 className="w-4 h-4" />Edit Product
            </Button>
          </EditProductSheet>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ✅ Stock Banner — visible instantly, shows live unit count */}
        {isPhysical && (
          <StockBanner
            stock={currentStock}
            minStock={currentMinStock}
            productName={displayName}
          />
        )}

        {/* ── Product title + badge row ── */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            <Link href={`/products/${product.slug}`} className="hover:text-blue-600 transition-colors">
              {activeVariant
                ? `${product.name} › ${activeVariant.slug || activeVariant.name}`
                : product.name}
            </Link>
          </h1>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Publish / stock status */}
            <Badge
              variant={stockStatusInfo.visibility === "visible" ? "default" : "secondary"}
              className={`border ${
                stockStatusInfo.color === "green"
                  ? "bg-green-100 text-green-800 border-green-200"
                  : stockStatusInfo.color === "yellow"
                  ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                  : "bg-gray-100 text-gray-600 border-gray-200"
              }`}
            >
              {stockStatusInfo.status === "published"
                ? <><CheckCircle2 className="w-3 h-3 mr-1" />{stockStatusInfo.label}</>
                : <><AlertCircle  className="w-3 h-3 mr-1" />{stockStatusInfo.label}</>}
            </Badge>

            {/* Product type */}
            <Badge variant="outline" className="bg-white">{product.product_type || "Physical"}</Badge>

            {/* ✅ Inline stock badge in header */}
            {isPhysical && (
              <Badge
                variant="outline"
                className={`font-semibold ${
                  currentStock <= 0
                    ? "border-red-300 text-red-700 bg-red-50"
                    : currentStock <= currentMinStock
                    ? "border-amber-300 text-amber-700 bg-amber-50"
                    : "border-green-300 text-green-700 bg-green-50"
                }`}
              >
                <Archive className="w-3 h-3 mr-1" />
                {currentStock <= 0 ? "Out of Stock" : `${currentStock} units in stock`}
              </Badge>
            )}
          </div>
        </div>

        {/* ── Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Image */}
          <div className="lg:col-span-1">
            <ProductImageGallery product={safeCurrentProduct} displayImages={displayImages} displayName={displayName} />
          </div>

          {/* Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-white border border-gray-200 p-1">
                <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  <BarChart3 className="w-4 h-4" />Overview
                </TabsTrigger>
                <TabsTrigger value="details"  className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  <FileText className="w-4 h-4" />Details
                </TabsTrigger>
                <TabsTrigger value="variants" className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  <Layers className="w-4 h-4" />Variants
                </TabsTrigger>
                <TabsTrigger value="seo"      className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  <Search className="w-4 h-4" />SEO
                </TabsTrigger>
              </TabsList>

              {/* ── Overview ── */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Pricing */}
                  <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-medium flex items-center gap-2 text-gray-700">
                        <DollarSign className="w-4 h-4" />Pricing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-600">Selling Price</span>
                        <span className="text-xl font-semibold text-gray-900">
                          ₹{safeCurrentProduct.selling_price?.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-600">Cost Price</span>
                        <span className="text-base text-gray-700">
                          ₹{safeCurrentProduct.cost_price?.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-medium text-gray-700">Profit Margin</span>
                        <span className={`text-base font-semibold ${parseFloat(profitMargin) > 20 ? "text-green-600" : "text-orange-600"}`}>
                          {profitMargin}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ✅ Inventory Card (physical only) */}
                  {isPhysical && (
                    <Card className="border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2 text-gray-700">
                          <Archive className="w-4 h-4" />
                          Inventory
                          <span className="ml-auto flex items-center gap-1 text-xs font-normal text-gray-400">
                            <span className={`w-2 h-2 rounded-full animate-pulse ${currentStock > 0 ? "bg-green-400" : "bg-red-400"}`} />
                            Live
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <InventoryCardContent
                          stock={currentStock}
                          minStock={currentMinStock}
                          stockData={stockData}
                          stockStatusInfo={stockStatusInfo}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Digital Product Card */}
                  {!isPhysical && (
                    <Card className="border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2 text-gray-700">
                          <FileText className="w-4 h-4" />Digital Product
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-gray-600">File Type</span>
                          <span className="text-base font-semibold text-gray-900 uppercase">
                            {(product as any).download_format || "N/A"}
                          </span>
                        </div>
                        {(product as any).file_size && (
                          <div className="flex justify-between items-baseline">
                            <span className="text-sm text-gray-600">File Size</span>
                            <span className="text-base text-gray-700">
                              {((product as any).file_size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        )}
                        {(product as any).file_path && (
                          <div className="pt-4 border-t border-gray-200">
                            <Button
                              onClick={async () => {
                                const filename = (product as any).file_path.split("/").pop();
                                try {
                                  const res = await fetch(`/uploads/products/${filename}`);
                                  const blob = await res.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url; a.download = filename;
                                  document.body.appendChild(a); a.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                } catch {
                                  window.open(`/uploads/products/${filename}`, "_blank");
                                }
                              }}
                              className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                              size="sm"
                            >
                              <Download className="w-4 h-4" />Download Digital File
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Description */}
                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base font-medium text-gray-700">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {product.description || "No description available"}
                    </p>
                  </CardContent>
                </Card>

                {/* Categories & Tags */}
                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center gap-2 text-gray-700">
                      <Tag className="w-4 h-4" />Categories & Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Categories</p>
                      <div className="flex flex-wrap gap-2">
                        {product.categories?.length > 0 ? (
                          product.categories.map((cat: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {cat.category.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">No categories</span>
                        )}
                      </div>
                    </div>
                    {product.tags?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {product.tags.map((tag: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Details ── */}
              <TabsContent value="details" className="space-y-4">
                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base font-medium text-gray-700">Product Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">SKU</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
                          {safeCurrentProduct.sku || "N/A"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Product Type</dt>
                        <dd className="mt-1 text-sm text-gray-900 capitalize">{product.product_type || "Physical"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {new Date(product.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {new Date(product.updated_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                {/* ✅ FIX: Inventory Details in Details tab */}
                {isPhysical && (
                  <Card className="border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base font-medium text-gray-700 flex items-center gap-2">
                        Inventory Details
                        <span className="ml-auto flex items-center gap-1 text-xs font-normal text-gray-400">
                          <span className={`w-2 h-2 rounded-full animate-pulse ${currentStock > 0 ? "bg-green-400" : "bg-red-400"}`} />
                          Live Stock
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <InventoryCardContent
                        stock={currentStock}
                        minStock={currentMinStock}
                        stockData={stockData}
                        stockStatusInfo={stockStatusInfo}
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── Variants ── */}
              <TabsContent value="variants" className="space-y-4">
                {!isPhysical ? (
                  <Card className="border-gray-200">
                    <CardContent className="pt-6">
                      <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">Digital products don't have variants</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : product.product_variants?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.product_variants.map((variant: any, idx: number) => {
                      // ✅ FIX: each variant reads its own stock_data injected by API
                      const { stock: vStock, minStock: vMin } = resolveStock(product, variant);
                      const isOut = vStock <= 0;
                      const isLow = !isOut && vStock <= vMin;
                      const vPct  = vMin > 0 ? Math.min((vStock / (vMin * 2)) * 100, 100) : vStock > 0 ? 50 : 0;

                      return (
                        <Card
                          key={idx}
                          className='border-gray-200 '
                        >
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <Link
                                  href={`/products/${product.slug}?variant=${variant.slug}`}
                                  className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                                >
                                  {variant.slug}
                                </Link>
                                <div className="flex items-center gap-2">
                                  {/* {activeVariant?.slug === variant.slug && (
                                    <Badge className="text-xs bg-blue-100 text-blue-800">Selected</Badge>
                                  )} */}
                                  {/* ✅ Per-variant stock badge */}
                                  <Badge
                                    variant="outline"
                                    className={`text-xs font-semibold ${
                                      isOut ? "border-red-300 text-red-700 bg-red-50"
                                      : isLow ? "border-amber-300 text-amber-700 bg-amber-50"
                                      : "border-green-300 text-green-700 bg-green-50"
                                    }`}
                                  >
                                    {isOut ? "Out of Stock" : `${vStock} units`}
                                  </Badge>
                                </div>
                              </div>

                              <dl className="space-y-2 text-sm">
                                {variant.sku && (
                                  <div className="flex justify-between">
                                    <dt className="text-gray-600">SKU</dt>
                                    <dd className="font-mono text-gray-900">{variant.sku}</dd>
                                  </div>
                                )}
                                {variant.selling_price && (
                                  <div className="flex justify-between">
                                    <dt className="text-gray-600">Price</dt>
                                    <dd className="font-semibold text-green-600">₹{variant.selling_price.toLocaleString("en-IN")}</dd>
                                  </div>
                                )}
                                {/* ✅ Live stock per variant */}
                                <div className="flex justify-between">
                                  <dt className="text-gray-600">Stock</dt>
                                  <dd className={`font-semibold ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-gray-900"}`}>
                                    {vStock} units
                                  </dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-gray-600">Min. Stock</dt>
                                  <dd className="font-semibold text-gray-900">{vMin} units</dd>
                                </div>

                                {/* Mini stock bar */}
                                <div className={`h-1.5 rounded-full mt-1 ${isOut ? "bg-red-100" : isLow ? "bg-amber-100" : "bg-green-100"}`}>
                                  <div
                                    className={`h-full rounded-full ${isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-green-500"}`}
                                    style={{ width: `${Math.max(vPct, vStock > 0 ? 3 : 0)}%` }}
                                  />
                                </div>

                                {variant.images?.length > 0 && (
                                  <div>
                                    <dt className="text-gray-600 mb-2 block">Images</dt>
                                    <dd className="flex gap-2 overflow-x-auto">
                                      {variant.images.slice(0, 5).map((img: string, i: number) => (
                                        <div key={i} className="w-12 h-12 rounded border border-gray-200 overflow-hidden flex-shrink-0">
                                          <img src={img} alt={`Variant img ${i + 1}`} className="w-full h-full object-cover" />
                                        </div>
                                      ))}
                                      {variant.images.length > 5 && (
                                        <div className="w-12 h-12 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-500">
                                          +{variant.images.length - 5}
                                        </div>
                                      )}
                                    </dd>
                                  </div>
                                )}

                                {variant.published !== undefined && (
                                  <div className="flex justify-between">
                                    <dt className="text-gray-600">Published</dt>
                                    <dd>
                                      <Badge variant={variant.published ? "default" : "secondary"} className="text-xs">
                                        {variant.published ? "Published" : "Draft"}
                                      </Badge>
                                    </dd>
                                  </div>
                                )}
                              </dl>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="border-gray-200">
                    <CardContent className="pt-6">
                      <div className="text-center py-12">
                        <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No variants available</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── SEO ── */}
              <TabsContent value="seo" className="space-y-4">
                {product.seo?.title || product.seo?.description || product.seo?.keywords?.length ? (
                  <Card className="border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base font-medium text-gray-700">SEO Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {product.seo.title && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Meta Title</label>
                          <div className="bg-gray-50 p-3 rounded border border-gray-200">
                            <p className="text-sm text-gray-900">{product.seo.title}</p>
                          </div>
                        </div>
                      )}
                      {product.seo.description && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Meta Description</label>
                          <div className="bg-gray-50 p-3 rounded border border-gray-200">
                            <p className="text-sm text-gray-900">{product.seo.description}</p>
                          </div>
                        </div>
                      )}
                      {product.seo.keywords?.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Keywords</label>
                          <div className="flex flex-wrap gap-2">
                            {product.seo.keywords.map((kw: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{kw}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-gray-200">
                    <CardContent className="pt-6">
                      <div className="text-center py-12">
                        <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No SEO configuration</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}