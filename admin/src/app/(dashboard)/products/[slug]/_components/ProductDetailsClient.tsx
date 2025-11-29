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
import { Progress } from "@/components/ui/progress";
import Typography from "@/components/ui/typography";
import { 
  ArrowLeft, 
  Edit3, 
  Package, 
  TrendingUp, 
  FileText, 
  Layers, 
  Search,
  Calendar,
  Tag,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Archive,
  Download
} from "lucide-react";
import { EditProductSheet } from "./EditProductSheet";
import { ProductDetails } from "@/types/api";
import { getStockStatus, getStockDisplayText, shouldShowProduct, canPurchaseProduct } from "@/utils/stockStatus";

type ProductDetailsClientProps = {
  product: ProductDetails;
};

const ProductImageGallery = memo(({ product, displayImages, displayName }: { product: any; displayImages: string[]; displayName: string }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Use displayImages if provided, otherwise fall back to product.image_url
  const images = displayImages.length > 0 ? displayImages : product.image_url || [];

  return (
    <div className="w-full">
      {images.length > 0 ? (
        <div className="space-y-3">
          <div className="aspect-square w-full bg-white rounded-lg border border-gray-200 overflow-hidden">
            <Image
              src={images[selectedImageIndex]}
              alt={`${displayName || 'Product'} - Main`}
              width={400}
              height={400}
              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
              onClick={() => console.log("Image clicked")}
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
                      ? 'border-blue-600 ring-2 ring-blue-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <Image
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
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

export default function ProductDetailsClient({ product }: ProductDetailsClientProps) {
  console.log('🔍 Client: Component received product prop:', product);
  console.log('🔍 Client: Product prop type:', typeof product);
  console.log('🔍 Client: Product prop keys:', product ? Object.keys(product) : 'null');

  // Early return if product is not available
  if (!product) {
    console.error('❌ Client: Product data is null/undefined');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Product not found</p>
        </div>
      </div>
    );
  }

  console.log('✅ Client: Product data received:', product.name);

  const router = useRouter();
  const searchParams = useSearchParams();
  const variantSlug = searchParams.get('variant');

  // Find the selected variant based on the URL parameter, or use first variant for variant products
  const selectedVariant = variantSlug && product.product_variants
    ? product.product_variants.find((v: any) => v.slug === variantSlug)
    : null;

  // For variant products, use the first variant as the main display if no specific variant is selected
  const defaultVariant = !selectedVariant && product.product_structure === 'variant' && product.product_variants && product.product_variants.length > 0
    ? product.product_variants[0]
    : null;

  // Use variant data if selected, otherwise use default variant for variant products, otherwise use main product data
  const currentProduct = selectedVariant || defaultVariant || product;

  // Ensure currentProduct is defined
  const safeCurrentProduct = currentProduct || product || {};

  // Determine which images to use - variant images take priority
  const displayImages = safeCurrentProduct.image_url && Array.isArray(safeCurrentProduct.image_url) && safeCurrentProduct.image_url.length > 0
    ? safeCurrentProduct.image_url
    : (product?.image_url && Array.isArray(product.image_url) ? product.image_url : []);

  const displayName = safeCurrentProduct.name || product?.name || 'Unnamed Product';

  // Determine inventory values - use variant inventory if available, otherwise use main product
  const currentStock = selectedVariant
    ? (selectedVariant.stock !== undefined ? selectedVariant.stock : (product?.baseStock || 0))
    : (product?.baseStock || 0);

  const currentMinStock = selectedVariant
    ? (selectedVariant.minStock !== undefined ? selectedVariant.minStock : (product?.minStock || 0))
    : (product?.minStock || 0);

  // Get stock status for the current product/variant
  const stockStatusInfo = getStockStatus(currentStock, product?.published, false); // Assuming not archived for now

  const stockPercentage = currentStock && currentMinStock
    ? Math.min((currentStock / (currentMinStock * 2)) * 100, 100)
    : 0;

  const profitMargin = safeCurrentProduct.cost_price && safeCurrentProduct.selling_price
    ? (((safeCurrentProduct.selling_price - safeCurrentProduct.cost_price) / safeCurrentProduct.selling_price) * 100).toFixed(1)
    : "0";

  // Use the new stock status system instead of old isLowStock logic
  const isLowStock = stockStatusInfo.status === 'out_of_stock';

  const handleBack = () => {
    router.push('/products');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={handleBack}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="h-4 w-px bg-gray-300" />
              <span className="text-sm text-gray-500">Product Details</span>
            </div>
            <EditProductSheet product={product}>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <Edit3 className="w-4 h-4" />
                Edit Product
              </Button>
            </EditProductSheet>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Product Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                  <Link
                    href={`/products/${product.slug}`}
                    className="hover:text-black-600 transition-colors cursor-pointer"
                  >
                    {currentProduct === product ? product.name : `${product.name} > ${currentProduct.slug || currentProduct.name}`}
                  </Link>
                </h1>
                
                <div className="flex items-center gap-2">
                  <Badge
                    variant={stockStatusInfo.visibility === 'visible' ? "default" : "secondary"}
                    className={`${
                      stockStatusInfo.color === 'green'
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : stockStatusInfo.color === 'yellow'
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    } border`}
                  >
                    {stockStatusInfo.status === 'published' ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" /> {stockStatusInfo.label}</>
                    ) : stockStatusInfo.status === 'out_of_stock' ? (
                      <><AlertCircle className="w-3 h-3 mr-1" /> {stockStatusInfo.label}</>
                    ) : (
                      <><AlertCircle className="w-3 h-3 mr-1" /> {stockStatusInfo.label}</>
                    )}
                  </Badge>
                  <Badge variant="outline" className="bg-white">
                    {product.product_type || "Physical"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Image */}
          <div className="lg:col-span-1">
            <ProductImageGallery product={safeCurrentProduct} displayImages={displayImages} displayName={displayName} />
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-white border border-gray-200 p-1">
                <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  <BarChart3 className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="details" className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  <FileText className="w-4 h-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="variants" className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  <Layers className="w-4 h-4" />
                  Variants
                </TabsTrigger>
                <TabsTrigger value="seo" className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  <Search className="w-4 h-4" />
                  SEO
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pricing Card */}
                  <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-medium flex items-center gap-2 text-gray-700">
                        <DollarSign className="w-4 h-4" />
                        Pricing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-600">Selling Price</span>
                        <span className="text-xl font-semibold text-gray-900">₹{safeCurrentProduct.selling_price?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-600">Cost Price</span>
                        <span className="text-base text-gray-700">₹{safeCurrentProduct.cost_price?.toLocaleString('en-IN')}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-medium text-gray-700">Profit Margin</span>
                        <span className={`text-base font-semibold ${parseFloat(profitMargin) > 20 ? 'text-green-600' : 'text-orange-600'}`}>
                          {profitMargin}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Inventory Card - Only for Physical Products */}
                  {product.product_type !== 'digital' && (
                    <Card className="border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2 text-gray-700">
                          <Archive className="w-4 h-4" />
                          Inventory
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-gray-600">Current Stock</span>
                          <span className="text-xl font-semibold text-gray-900">{getStockDisplayText(currentStock)}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-gray-600">Min. Threshold</span>
                          <span className="text-base text-gray-700">{currentMinStock || 0}</span>
                        </div>
                        <Separator />
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Status</span>
                            <span className={`font-medium ${
                              stockStatusInfo.color === 'green' ? 'text-green-600' :
                              stockStatusInfo.color === 'yellow' ? 'text-yellow-600' :
                              'text-gray-600'
                            }`}>
                              {stockStatusInfo.label}
                            </span>
                          </div>
                          <div className={`h-2 rounded-full ${
                            stockStatusInfo.color === 'green' ? 'bg-green-100' :
                            stockStatusInfo.color === 'yellow' ? 'bg-yellow-100' :
                            'bg-gray-100'
                          }`}>
                            <div
                              className={`h-full rounded-full transition-all ${
                                stockStatusInfo.color === 'green' ? 'bg-green-600' :
                                stockStatusInfo.color === 'yellow' ? 'bg-yellow-600' :
                                'bg-gray-400'
                              }`}
                              style={{ width: `${stockPercentage}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Digital Product Card */}
                  {product.product_type === 'digital' && (
                    <Card className="border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2 text-gray-700">
                          <FileText className="w-4 h-4" />
                          Digital Product
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-gray-600">File Type</span>
                          <span className="text-base font-semibold text-gray-900 uppercase">
                            {(product as any).download_format || 'N/A'}
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
                        {(product as any).license_type && (
                          <div className="flex justify-between items-baseline">
                            <span className="text-sm text-gray-600">License</span>
                            <span className="text-base text-gray-700 capitalize">
                              {(product as any).license_type}
                            </span>
                          </div>
                        )}
                        {(product as any).download_limit && (
                          <div className="flex justify-between items-baseline">
                            <span className="text-sm text-gray-600">Download Limit</span>
                            <span className="text-base text-gray-700">
                              {(product as any).download_limit} downloads
                            </span>
                          </div>
                        )}

                        {/* Download Button for Digital Products */}
                        {(product as any).file_path && (
                          <div className="pt-4 border-t border-gray-200">
                            <Button
                              onClick={async () => {
                                const filePath = (product as any).file_path;
                                if (filePath) {
                                  try {
                                    const filename = filePath.split('/').pop();
                                    const downloadUrl = `/uploads/products/${filename}`;
                                    
                                    // Use fetch to get the file and trigger download
                                    const response = await fetch(downloadUrl);
                                    if (!response.ok) {
                                      throw new Error(`HTTP error! status: ${response.status}`);
                                    }
                                    
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.style.display = 'none';
                                    a.href = url;
                                    a.download = filename || 'digital-file';
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                  } catch (error) {
                                    console.error('Download failed:', error);
                                    // Fallback: try direct link approach
                                    try {
                                      const link = document.createElement('a');
                                      const filename = filePath.split('/').pop();
                                      const downloadUrl = `/uploads/products/${filename}`;
                                      
                                      link.href = downloadUrl;
                                      link.download = filename || 'digital-file';
                                      link.target = '_blank';
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    } catch (fallbackError) {
                                      console.error('Fallback download also failed:', fallbackError);
                                      // Final fallback: open in new tab
                                      const filename = filePath.split('/').pop();
                                      const downloadUrl = `/uploads/products/${filename}`;
                                      window.open(downloadUrl, '_blank');
                                    }
                                  }
                                }
                              }}
                              className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                              size="sm"
                            >
                              <Download className="w-4 h-4" />
                              Download Digital File
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

                {/* Categories */}
                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center gap-2 text-gray-700">
                      <Tag className="w-4 h-4" />
                      Categories & Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Categories</p>
                      <div className="flex flex-wrap gap-2">
                        {product.categories && product.categories.length > 0 ? (
                          product.categories.map((cat, idx) => (
                            <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {cat.category.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">No categories</span>
                        )}
                      </div>
                    </div>

                    {product.categories && product.categories.some(cat => cat.subcategories?.length > 0) && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Subcategories</p>
                        <div className="flex flex-wrap gap-2">
                          {product.categories
                            .flatMap(cat => cat.subcategories || [])
                            .map((sub, idx) => (
                              <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                {sub.name}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {product.tags && product.tags.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {product.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Details Tab */}
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
                          {safeCurrentProduct.sku || 'N/A'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Product Type</dt>
                        <dd className="mt-1 text-sm text-gray-900 capitalize">{product.product_type || "Physical"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {new Date(product.created_at).toLocaleDateString('en-IN', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {new Date(product.updated_at).toLocaleDateString('en-IN', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                {/* Inventory Details - Only for Physical Products */}
                {product.product_type !== 'digital' && (
                  <Card className="border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base font-medium text-gray-700">Inventory Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-3">
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Current Stock</dt>
                          <dd className="text-sm font-semibold text-gray-900">{getStockDisplayText(currentStock)} units</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">Minimum Stock</dt>
                          <dd className="text-sm font-semibold text-gray-900">{currentMinStock || 0} units</dd>
                        </div>
                        <Separator />
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Stock Health</span>
                            <span className={`text-sm font-medium ${
                              stockStatusInfo.color === 'green' ? 'text-green-600' :
                              stockStatusInfo.color === 'yellow' ? 'text-yellow-600' :
                              'text-gray-600'
                            }`}>
                              {stockStatusInfo.label}
                            </span>
                          </div>
                          <div className={`h-2.5 rounded-full ${
                            stockStatusInfo.color === 'green' ? 'bg-green-100' :
                            stockStatusInfo.color === 'yellow' ? 'bg-yellow-100' :
                            'bg-gray-100'
                          }`}>
                            <div
                              className={`h-full rounded-full transition-all ${
                                stockStatusInfo.color === 'green' ? 'bg-green-600' :
                                stockStatusInfo.color === 'yellow' ? 'bg-yellow-600' :
                                'bg-gray-400'
                              }`}
                              style={{ width: `${stockPercentage}%` }}
                            />
                          </div>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                )}

                {/* Digital Product Details */}
                {product.product_type === 'digital' && (
                  <Card className="border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base font-medium text-gray-700">Digital Product Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-3">
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-600">File Path</dt>
                          <dd className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">
                            {(product as any).file_path ? (product as any).file_path.split('/').pop() : 'No file uploaded'}
                          </dd>
                        </div>
                        {(product as any).file_size && (
                          <div className="flex justify-between">
                            <dt className="text-sm text-gray-600">File Size</dt>
                            <dd className="text-sm font-semibold text-gray-900">
                              {((product as any).file_size / (1024 * 1024)).toFixed(2)} MB
                            </dd>
                          </div>
                        )}
                        {(product as any).download_format && (
                          <div className="flex justify-between">
                            <dt className="text-sm text-gray-600">Format</dt>
                            <dd className="text-sm font-semibold text-gray-900 uppercase">
                              {(product as any).download_format}
                            </dd>
                          </div>
                        )}
                        {(product as any).license_type && (
                          <div className="flex justify-between">
                            <dt className="text-sm text-gray-600">License Type</dt>
                            <dd className="text-sm font-semibold text-gray-900 capitalize">
                              {(product as any).license_type}
                            </dd>
                          </div>
                        )}
                        {(product as any).download_limit && (
                          <div className="flex justify-between">
                            <dt className="text-sm text-gray-600">Download Limit</dt>
                            <dd className="text-sm font-semibold text-gray-900">
                              {(product as any).download_limit} downloads
                            </dd>
                          </div>
                        )}

                        {/* Download Button for Digital Products */}
                        {(product as any).file_path && (
                          <div className="pt-4 border-t border-gray-200">
                            <Button
                              onClick={async () => {
                                const filePath = (product as any).file_path;
                                if (filePath) {
                                  try {
                                    const filename = filePath.split('/').pop();
                                    const downloadUrl = `/api/products/uploads/${filename}`;
                                    
                                    // Use fetch to get the file and trigger download
                                    const response = await fetch(downloadUrl);
                                    if (!response.ok) {
                                      throw new Error(`HTTP error! status: ${response.status}`);
                                    }
                                    
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.style.display = 'none';
                                    a.href = url;
                                    a.download = filename || 'digital-file';
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                  } catch (error) {
                                    console.error('Download failed:', error);
                                    // Fallback: try direct link approach
                                    try {
                                      const link = document.createElement('a');
                                      const filename = filePath.split('/').pop();
                                      const downloadUrl = `/api/products/uploads/${filename}`;
                                      
                                      link.href = downloadUrl;
                                      link.download = filename || 'digital-file';
                                      link.target = '_blank';
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    } catch (fallbackError) {
                                      console.error('Fallback download also failed:', fallbackError);
                                      // Final fallback: open in new tab
                                      const filename = filePath.split('/').pop();
                                      const downloadUrl = `/api/products/uploads/${filename}`;
                                      window.open(downloadUrl, '_blank');
                                    }
                                  }
                                }
                              }}
                              className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                              size="sm"
                            >
                              <Download className="w-4 h-4" />
                              Download Digital File
                            </Button>
                          </div>
                        )}
                      </dl>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Variants Tab */}
              <TabsContent value="variants" className="space-y-4">
                {product.product_type === 'digital' ? (
                  <Card className="border-gray-200">
                    <CardContent className="pt-6">
                      <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">Digital products don't have variants</p>
                        <p className="text-xs text-gray-400 mt-1">Variants are only available for physical products</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : product.product_variants &&
                 Array.isArray(product.product_variants) &&
                 product.product_variants.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.product_variants.map((variant: any, idx: number) => (
                      <Card key={idx} className={`border-gray-200 ${selectedVariant && selectedVariant.slug === variant.slug ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}>
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <Link
                                href={`/products/${product.slug}?variant=${variant.slug}`}
                                className="font-medium text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                              >
                                {variant.slug}
                              </Link>
                              <div className="flex items-center gap-2">
                                {selectedVariant && selectedVariant.slug === variant.slug && (
                                  <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">Selected</Badge>
                                )}
                                <Badge variant="outline" className="text-xs">Variant</Badge>
                              </div>
                            </div>
                            <dl className="space-y-2 text-sm">
                              {variant.sku && (
                                <div className="flex justify-between">
                                  <dt className="text-gray-600">SKU</dt>
                                  <dd className="font-mono text-gray-900">{variant.sku}</dd>
                                </div>
                              )}
                              {variant.cost_price && (
                                <div className="flex justify-between">
                                  <dt className="text-gray-600">Cost Price</dt>
                                  <dd className="font-semibold text-gray-900">₹{variant.cost_price.toLocaleString('en-IN')}</dd>
                                </div>
                              )}
                              {variant.selling_price && (
                                <div className="flex justify-between">
                                  <dt className="text-gray-600">Selling Price</dt>
                                  <dd className="font-semibold text-green-600">₹{variant.selling_price.toLocaleString('en-IN')}</dd>
                                </div>
                              )}
                              {variant.stock !== undefined && (
                                <div className="flex justify-between">
                                  <dt className="text-gray-600">Stock</dt>
                                  <dd className="font-semibold text-gray-900">{getStockDisplayText(variant.stock)} units</dd>
                                </div>
                              )}
                              {variant.minStock !== undefined && (
                                <div className="flex justify-between">
                                  <dt className="text-gray-600">Min. Stock</dt>
                                  <dd className="font-semibold text-gray-900">{variant.minStock} units</dd>
                                </div>
                              )}
                              {variant.stock !== undefined && (
                                <div className="flex justify-between">
                                  <dt className="text-gray-600">Status</dt>
                                  <dd>
                                    {(() => {
                                      const variantStatus = getStockStatus(variant.stock, variant.published, false);
                                      return (
                                        <Badge
                                          variant={variantStatus.visibility === 'visible' ? "default" : "secondary"}
                                          className={`text-xs ${
                                            variantStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                                            variantStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-600'
                                          }`}
                                        >
                                          {variantStatus.label}
                                        </Badge>
                                      );
                                    })()}
                                  </dd>
                                </div>
                              )}
                              {variant.images && variant.images.length > 0 && (
                                <div>
                                  <dt className="text-gray-600 mb-2 block">Images</dt>
                                  <dd>
                                    <div className="flex gap-2 overflow-x-auto">
                                      {variant.images.slice(0, 5).map((image: string, imgIdx: number) => (
                                        <div key={imgIdx} className="w-12 h-12 rounded border border-gray-200 overflow-hidden flex-shrink-0">
                                          <img
                                            src={image}
                                            alt={`Variant image ${imgIdx + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ))}
                                      {variant.images.length > 5 && (
                                        <div className="w-12 h-12 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-500">
                                          +{variant.images.length - 5}
                                        </div>
                                      )}
                                    </div>
                                  </dd>
                                </div>
                              )}
                              {variant.published !== undefined && (
                                <div className="flex justify-between">
                                  <dt className="text-gray-600">Status</dt>
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
                    ))}
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

              {/* SEO Tab */}
              <TabsContent value="seo" className="space-y-4">
                {product.seo && (product.seo.title || product.seo.description || (product.seo.keywords && product.seo.keywords.length > 0)) ? (
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

                      {product.seo.keywords && product.seo.keywords.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Keywords</label>
                          <div className="flex flex-wrap gap-2">
                            {product.seo.keywords.map((keyword: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                {keyword}
                              </Badge>
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