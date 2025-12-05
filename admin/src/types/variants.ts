// Variant Types for Product Management

export interface ProductVariantAttribute {
  id: string;
  name: string;
  type: 'select' | 'multiselect' | 'text' | 'number';
  required: boolean;
  options?: string[]; // For select/multiselect types
  allowCustom?: boolean; // Allow custom values
}

export interface ProductVariantValue {
  attributeId: string;
  value: string;
  custom?: boolean; // If it's a custom value added by admin
}

export interface ProductVariantCombination {
  id: string;
  name: string; // Auto-generated from product name + variant attributes
  sku: string;
  slug: string; // Required for URL-friendly identification

  // Use ONLY camelCase for frontend - backend will transform
  costPrice?: number;
  salesPrice?: number;

  stock?: number;
  minStock?: number;
  images?: (string | File)[];

  attributes: Record<string, string>; // All attributes stored as key-value pairs

  published: boolean;
}

export interface ProductVariantData {
  attributes: ProductVariantAttribute[];
  combinations: ProductVariantCombination[];
  autoGenerateSKU: boolean;
  autoGenerateStock: boolean;
}

// Default variant attributes for physical products
export const DEFAULT_VARIANT_ATTRIBUTES: Omit<ProductVariantAttribute, 'id'>[] = [
  {
    name: 'size',
    type: 'select',
    required: false,
    options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    allowCustom: true,
  },
  {
    name: 'color',
    type: 'select',
    required: false,
    options: ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Purple', 'Orange'],
    allowCustom: true,
  },
  {
    name: 'material',
    type: 'select',
    required: false,
    options: ['Cotton', 'Polyester', 'Wool', 'Silk', 'Linen', 'Denim', 'Leather'],
    allowCustom: true,
  },
];

// Utility functions for variant management
export class VariantManager {
  static generateSKU(baseSKU: string, combination: ProductVariantValue[] | any): string {
    if (!combination) return baseSKU.toUpperCase();

    // Handle new structure (object with attributes)
    if (combination.attributes) {
      const attributeValues = Object.entries(combination.attributes)
        .filter(([_, value]) => value)
        .map(([key, value]) => String(value).substring(0, 3).toUpperCase())
        .join('-');
      return this.generateSKUFromValues(baseSKU, attributeValues);
    }

    // Legacy support - if it's an array, convert to new format
    if (Array.isArray(combination)) {
      const attributeValues = combination
        .map(v => v.value.substring(0, 3).toUpperCase())
        .join('-');
      return this.generateSKUFromValues(baseSKU, attributeValues);
    }

    return baseSKU.toUpperCase();
  }

  private static generateSKUFromValues(baseSKU: string, attributeValues: string): string {
    if (!attributeValues || attributeValues.length === 0) return baseSKU.toUpperCase();
    return `${baseSKU.toUpperCase()}-${attributeValues}`;
  }

  static generateVariantSKU(baseSKU: string, variantData: ProductVariantData): string {
    if (!variantData.combinations.length) return baseSKU.toUpperCase();

    // Use the first combination to generate a representative SKU
    const firstCombo = variantData.combinations[0];
    const attributeValues = Object.entries(firstCombo.attributes || {})
      .filter(([_, value]) => value)
      .map(([key, value]) => String(value).substring(0, 3).toUpperCase())
      .join('-');

    return this.generateSKUFromValues(baseSKU, attributeValues);
  }

  static generateCombinations(attributes: ProductVariantAttribute[], selectedValues: Record<string, string[]>): ProductVariantCombination[] {
    const attributeIds = Object.keys(selectedValues);
    if (attributeIds.length === 0) return [];

    // Generate all possible combinations
    const combinations = this.cartesianProduct(
      attributeIds.map(id => selectedValues[id].map(value => ({ attributeId: id, value })))
    );

    return combinations.map((combo, index) => {
      // Create attributes object for the new structure
      const attributesObj: Record<string, string> = {};
      combo.forEach(item => {
        const attr = attributes.find(a => a.id === item.attributeId);
        if (attr) {
          attributesObj[attr.name] = item.value;
        }
      });

      return {
        id: `variant-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        name: '', // Will be generated when product name is available
        sku: '', // Will be generated when SKU is available
        slug: '', // Will be generated based on product name and attributes
        costPrice: undefined as any, // No default value
        salesPrice: undefined as any, // No default value
        stock: undefined as any,
        minStock: undefined as any,
        images: [],
        attributes: attributesObj,
        published: true,
      };
    });
  }

  private static cartesianProduct<T>(arrays: T[][]): T[][] {
    return arrays.reduce<T[][]>(
      (acc, curr) => acc.flatMap(a => curr.map(b => [...a, b])),
      [[]]
    );
  }

  static validateAttributeName(name: string, existingAttributes: ProductVariantAttribute[]): boolean {
    return !existingAttributes.some(attr => attr.name.toLowerCase() === name.toLowerCase());
  }

  static generateVariantSlug(combination: ProductVariantCombination): string {
    // Generate slug based ONLY on variant attributes (no product slug)
    let slug = '';

    // Add variant attributes to make it unique
    if (combination.attributes && Object.keys(combination.attributes).length > 0) {
      const attributeValues = Object.entries(combination.attributes)
        .filter(([_, value]) => value && value.trim())
        .map(([key, value]) => this.slugify(value))
        .join('-');

      if (attributeValues) {
        slug = attributeValues;
      }
    }

    // If no attributes, use a generic fallback
    if (!slug) {
      slug = 'variant';
    }

    return slug;
  }

  static generateVariantName(productName: string, combination: ProductVariantCombination): string {
    // Generate name based on product name + variant attributes
    let name = productName;

    // Add variant attributes to make it descriptive
    if (combination.attributes && Object.keys(combination.attributes).length > 0) {
      const attributeValues = Object.entries(combination.attributes)
        .filter(([_, value]) => value && value.trim())
        .map(([key, value]) => value.trim())
        .join(' ');

      if (attributeValues) {
        name = `${productName} - ${attributeValues}`;
      }
    }

    return name;
  }

  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  static createAttribute(name: string, type: ProductVariantAttribute['type'] = 'text'): ProductVariantAttribute {
    // Get default options for common attributes
    const getDefaultOptions = (attrName: string): string[] => {
      const normalizedName = attrName.toLowerCase();
      if (normalizedName === 'size') {
        return ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      } else if (normalizedName === 'color') {
        return ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Purple', 'Orange'];
      } else if (normalizedName === 'material') {
        return ['Cotton', 'Polyester', 'Wool', 'Silk', 'Linen', 'Denim', 'Leather'];
      }
      return [];
    };

    return {
      id: `attr-${name.toLowerCase()}`, // Use consistent ID generation
      name,
      type,
      required: false,
      options: type === 'select' || type === 'multiselect' ? getDefaultOptions(name) : undefined,
      allowCustom: type !== 'number', // Allow custom for text, select, and multiselect, but not number
    };
  }
}