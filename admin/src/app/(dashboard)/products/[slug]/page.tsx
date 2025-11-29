import { Metadata } from "next";
import { notFound } from "next/navigation";

import { fetchProductDetails } from "@/services/products";
import ProductDetailsClient from "./_components/ProductDetailsClient";

type PageParams = {
  params: {
    slug: string;
  };
}

export async function generateMetadata({
  params: { slug },
}: PageParams): Promise<Metadata> {
  try {
    const { product } = await fetchProductDetails({
      slug,
    });

    return { title: product.name };
  } catch (e) {
    return { title: "Product not found" };
  }
}

export default async function ProductDetails({ params: { slug } }: PageParams) {
  try {
    console.log('🔍 SSR: Fetching product details for slug:', slug);
    const { product } = await fetchProductDetails({
      slug,
    });
    console.log('✅ SSR: Product details fetched successfully');
    console.log('✅ SSR: Product data:', product.name);

    return <ProductDetailsClient product={product} />;
  } catch (e) {
    console.error('❌ SSR: Error fetching product details:', e);
    return notFound();
  }
}
