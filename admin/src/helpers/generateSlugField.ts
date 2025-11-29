import slugify from "slugify";
import { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form";

type SlugifyOptions<T> = {
  sourceField: Path<T>;
  targetField: Path<T>;
};

export function generateSlugField<T extends FieldValues>(
  form: UseFormReturn<T>,
  options: SlugifyOptions<T>
) {
  const { sourceField, targetField } = options;

  try {
    const sourceValue = form.getValues(sourceField);

    if (sourceValue && typeof sourceValue === "string") {
      const generatedSlug = slugify(sourceValue, {
        lower: true,
        strict: true,
        locale: "en",
      }) as PathValue<T, Path<T>>;

      form.setValue(targetField, generatedSlug, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  } catch (error) {
    console.error('Error generating slug:', error);
    // If the direct path doesn't work, try to get the value differently
    try {
      const formValues = form.getValues();
      const pathParts = sourceField.split('.');
      let value = formValues;

      for (const part of pathParts) {
        if (part.includes('[') && part.includes(']')) {
          // Handle array indices like subcategories[0]
          const match = part.match(/(\w+)\[(\d+)\]/);
          if (match) {
            const [, arrayName, index] = match;
            value = value?.[arrayName]?.[parseInt(index)];
          } else {
            value = value?.[part];
          }
        } else {
          value = value?.[part];
        }
      }

      if (value && typeof value === "string") {
        const generatedSlug = slugify(value, {
          lower: true,
          strict: true,
          locale: "en",
        }) as PathValue<T, Path<T>>;

        form.setValue(targetField, generatedSlug, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    } catch (fallbackError) {
      console.error('Fallback slug generation also failed:', fallbackError);
    }
  }
}
