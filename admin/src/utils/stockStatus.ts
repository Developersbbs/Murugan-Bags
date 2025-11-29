// Stock Status System for Product Management

export type StockStatus = 'published' | 'out_of_stock' | 'draft' | 'archived';

export interface StockStatusInfo {
  status: StockStatus;
  label: string;
  description: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
  visibility: 'visible' | 'visible_with_badge' | 'hidden';
  canPurchase: boolean;
}

/**
 * Determines the stock status of a product based on stock levels and admin settings
 * @param stock - Current stock level (can be null/undefined if not set)
 * @param published - Whether the product is manually published by admin
 * @param archived - Whether the product is archived by admin
 * @returns StockStatusInfo object with status details
 */
export function getStockStatus(stock?: number | null, published: boolean = true, archived: boolean = false): StockStatusInfo {
  // If product is archived by admin, always show as archived
  if (archived) {
    return {
      status: 'archived',
      label: 'Archived',
      description: 'Product is stored but not active',
      color: 'gray',
      visibility: 'hidden',
      canPurchase: false,
    };
  }

  // If stock is null/undefined (not set by admin)
  if (stock === null || stock === undefined) {
    return {
      status: 'draft',
      label: 'Draft',
      description: 'Product not ready for listing yet',
      color: 'gray',
      visibility: 'hidden',
      canPurchase: false,
    };
  }

  // If stock is 0
  if (stock === 0) {
    return {
      status: 'out_of_stock',
      label: 'Out of Stock',
      description: 'Visible but cannot be purchased',
      color: 'yellow',
      visibility: 'visible_with_badge',
      canPurchase: false,
    };
  }

  // If stock > 0 and published
  if (stock > 0 && published) {
    return {
      status: 'published',
      label: 'In Stock',
      description: 'Product is ready for sale',
      color: 'green',
      visibility: 'visible',
      canPurchase: true,
    };
  }

  // Fallback - if stock > 0 but not published, treat as draft
  return {
    status: 'draft',
    label: 'Draft',
    description: 'Product not ready for listing yet',
    color: 'gray',
    visibility: 'hidden',
    canPurchase: false,
  };
}

/**
 * Gets the display text for stock value
 * @param stock - Stock value
 * @returns Display string ("-" for null/undefined, "0" for zero, or the number)
 */
export function getStockDisplayText(stock?: number | null): string {
  if (stock === null || stock === undefined) {
    return '-';
  }
  return stock.toString();
}

/**
 * Checks if a product should be visible to users based on stock status
 * @param stockStatus - The stock status info
 * @returns Whether the product should be visible
 */
export function shouldShowProduct(stockStatus: StockStatusInfo): boolean {
  return stockStatus.visibility === 'visible' || stockStatus.visibility === 'visible_with_badge';
}

/**
 * Checks if a product can be purchased based on stock status
 * @param stockStatus - The stock status info
 * @returns Whether the product can be purchased
 */
export function canPurchaseProduct(stockStatus: StockStatusInfo): boolean {
  return stockStatus.canPurchase;
}
