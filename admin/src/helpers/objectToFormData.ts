export function objectToFormData(obj: Record<string, any>, namespace = ''): FormData {
  const formData = new FormData();

  console.log('Converting to FormData:', obj);

  // Ensure productStructure is set to 'simple' for digital products
  if (obj.productType === 'digital' && (!obj.productStructure || obj.productStructure === null)) {
    obj.productStructure = 'simple';
    console.log('🚨 FRONTEND: Set productStructure to "simple" for digital product in objectToFormData');
  }

  Object.entries(obj).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }

    // Handle string URLs for image fields
    if (key === 'image' && typeof value === 'string' && value.startsWith('http')) {
      formData.append('image', value);
      return;
    }

    const formKey = namespace ? `${namespace}.${key}` : key;
    console.log('Processing key:', key, 'value:', value, 'formKey:', formKey);


    // Special handling for productStructure - convert to snake_case for backend
    if (key === 'productStructure') {
      console.log('🚨 FRONTEND: Processing productStructure field:', key, '=', value);
      formData.append('product_structure', String(value)); // Send as product_structure (snake_case)
      console.log('🚨 FRONTEND: Added product_structure to FormData: product_structure =', String(value));
      return;
    }

    // Special handling for digital product fields - convert camelCase to snake_case for backend
    // Only append if value is not empty string
    if (key === 'fileSize') {
      if (value !== '' && value !== 0) {
        console.log('🚨 FRONTEND: Converting fileSize to snake_case, value:', value);
        formData.append('file_size', String(value));
      } else {
        console.log('⚠️ FRONTEND: Skipping empty fileSize');
      }
      return;
    }
    if (key === 'downloadFormat') {
      if (value !== '' && String(value).trim() !== '') {
        console.log('🚨 FRONTEND: Converting downloadFormat to snake_case, value:', value);
        formData.append('download_format', String(value));
      } else {
        console.log('⚠️ FRONTEND: Skipping empty downloadFormat');
      }
      return;
    }
    if (key === 'licenseType') {
      if (value !== '' && String(value).trim() !== '') {
        console.log('🚨 FRONTEND: Converting licenseType to snake_case, value:', value);
        formData.append('license_type', String(value));
      } else {
        console.log('⚠️ FRONTEND: Skipping empty licenseType');
      }
      return;
    }
    if (key === 'downloadLimit') {
      if (value !== '' && value !== 0 && value !== undefined) {
        console.log('🚨 FRONTEND: Converting downloadLimit to snake_case, value:', value);
        formData.append('download_limit', String(value));
      } else {
        console.log('⚠️ FRONTEND: Skipping empty downloadLimit');
      }
      return;
    }

    // Special handling for product_variants - send as JSON string (expected by backend)
    if (key === 'product_variants' && value !== null && value !== undefined) {
      console.log('Processing product_variants as JSON:', value);

      // Create a deep copy to avoid mutating the original object
      const variantsCopy = JSON.parse(JSON.stringify(value, (key, val) => {
        // Skip File objects in the copy (they can't be stringified)
        return val instanceof File ? undefined : val;
      }));

      // Handle variant images separately - convert File objects to form fields
      if (value.combinations && Array.isArray(value.combinations)) {
        value.combinations.forEach((combo: any, comboIndex: number) => {
          if (combo.images && Array.isArray(combo.images)) {
            console.log(`Processing variant images for combination ${comboIndex}:`, combo.images.length);

            // Separate files and existing URLs
            const existingImages: string[] = [];
            let fileIndex = 0;

            combo.images.forEach((image: string | File) => {
              if (image instanceof File) {
                // Append as variant image file with sequential index
                formData.append(`variantImages[${comboIndex}][${fileIndex}]`, image);
                console.log(`Added variant image file: variantImages[${comboIndex}][${fileIndex}] = ${image.name}`);
                fileIndex++;
              } else if (typeof image === 'string') {
                // Keep existing image URLs
                existingImages.push(image);
              }
            });

            // Update the copy with only existing URLs (new files will be added by backend)
            if (variantsCopy.combinations && variantsCopy.combinations[comboIndex]) {
              variantsCopy.combinations[comboIndex].images = existingImages;
            }
          }

          // Debug: Log variant pricing data before JSON serialization
          console.log(`🚨 FRONTEND: Variant ${comboIndex} pricing data:`, {
            costPrice: combo.costPrice,
            salesPrice: combo.salesPrice,
            sellingPrice: combo.sellingPrice,
            stock: combo.stock,
            minStock: combo.minStock
          });
        });
      }

      formData.append('product_variants', JSON.stringify(variantsCopy));
      return;
    }

    // Special handling for categories, tags, seoKeywords - send as JSON string
    if ((key === 'categories' || key === 'tags' || key === 'seoKeywords') && (Array.isArray(value) || typeof value === 'object')) {
      console.log(`Processing ${key} as JSON:`, value);
      formData.append(key, JSON.stringify(value));
      return;
    }
    // Handle images array - append each file with same key name 'images'
    if (key === 'images' && Array.isArray(value)) {
      console.log('Processing images array:', value);
      value.forEach((item, index) => {
        if (item instanceof File) {
          formData.append('images', item);
          console.log(`Added image:`, item.name);
        }
      });
      return;
    }

    if (Array.isArray(value)) {
      console.log('Processing array for key:', key, value);
      value.forEach((item, index) => {
        console.log('Array item:', index, item);
        if (typeof item === 'object' && item !== null) {
          Object.entries(item).forEach(([itemKey, itemValue]) => {
            if (itemValue !== null && itemValue !== undefined) {
              const fieldKey = `${key}.${index}.${itemKey}`;
              console.log('Adding array field:', fieldKey, '=', itemValue);
              formData.append(fieldKey, String(itemValue));
            }
          });
        } else {
          // Handle primitive array items
          formData.append(`${key}.${index}`, String(item));
        }
      });
      return;
    }

    // Handle File objects
    if (value instanceof File) {
      console.log('Adding file:', formKey);
      formData.append(formKey, value);
      return;
    }

    // Handle nested objects recursively (but skip if it's variants - already handled above)
    if (typeof value === 'object' && value !== null && !(value instanceof File) && key !== 'variants') {
      console.log('Processing nested object:', formKey);
      const nestedFormData = objectToFormData(value, formKey);
      for (const [nestedKey, nestedValue] of Array.from(nestedFormData.entries())) {
        console.log('Adding nested field:', nestedKey, nestedValue);
        formData.append(nestedKey, nestedValue);
      }
      return;
    }

    // Handle regular values
    console.log('Adding regular field:', formKey, '=', value);
    formData.append(formKey, String(value));
  });

  console.log('Final FormData entries:');
  for (const [key, value] of Array.from(formData.entries())) {
    console.log(key, '=', value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
  }

  // Explicitly handle existing_images if it was added to the object but missed by the loop
  // @ts-ignore
  if (obj.existing_images !== undefined && !formData.has('existing_images')) {
    // @ts-ignore
    console.log('🚨 FRONTEND: Explicitly adding existing_images:', obj.existing_images);
    // @ts-ignore
    formData.append('existing_images', String(obj.existing_images));
  }

  return formData;
}