import { Control, FieldValues, Path, UseFormReturn } from "react-hook-form";
import { useEffect, useRef } from "react";

import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { generateSlugField } from "@/helpers/generateSlugField";

type FormSlugInputProps<TFormData extends FieldValues> = {
  control: Control<TFormData>;
  name: Path<TFormData>;
  label: string;
  placeholder: string;
  form: UseFormReturn<TFormData>;
  generateSlugFrom: Path<TFormData> | (() => Path<TFormData>);
};

function FormSlugInput<TFormData extends FieldValues>({
  control,
  name,
  label,
  form,
  generateSlugFrom,
  placeholder,
}: FormSlugInputProps<TFormData>) {
  const manuallyEditedRef = useRef(false);
  const previousSlugRef = useRef("");

  const handleGenerateSlug = () => {
    const sourceField = typeof generateSlugFrom === 'function' ? generateSlugFrom() : generateSlugFrom;
    generateSlugField(form, {
      sourceField,
      targetField: name,
    });
    manuallyEditedRef.current = false;
  };

  // Auto-generate slug when source field changes
  useEffect(() => {
    const sourceField = typeof generateSlugFrom === 'function' ? generateSlugFrom() : generateSlugFrom;
    const subscription = form.watch((value, { name: changedField }) => {
      if (changedField === sourceField) {
        const currentSlug = form.getValues(name as any);

        // Only auto-generate if slug is empty or hasn't been manually edited
        if (!currentSlug || !manuallyEditedRef.current) {
          generateSlugField(form, {
            sourceField,
            targetField: name,
          });
          previousSlugRef.current = form.getValues(name as any);
        }
      }

      // Track manual edits to the slug field
      if (changedField === name) {
        const currentSlug = form.getValues(name as any);
        if (currentSlug !== previousSlugRef.current) {
          manuallyEditedRef.current = true;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form, generateSlugFrom, name]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col md:flex-row md:gap-x-4 md:space-y-0">
          <FormLabel className="md:flex-shrink-0 md:w-1/4 md:mt-2 leading-snug">
            {label}
          </FormLabel>

          <div className="space-y-2 w-full">
            <FormControl>
              <div className="relative">
                <Input
                  type="text"
                  className="h-12 pr-[6.75rem] sm:pr-32"
                  placeholder={placeholder}
                  {...field}
                />

                <Button
                  type="button"
                  variant="secondary"
                  className="absolute top-0 right-0 border border-input px-6 h-12 w-24 sm:w-28 grid place-items-center rounded-none rounded-r-md flex-shrink-0"
                  onClick={handleGenerateSlug}
                >
                  Generate
                </Button>
              </div>
            </FormControl>

            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

export default FormSlugInput;
