"use client";

import { Control, FieldPath, FieldValues } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

interface FormSellableToggleProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function FormSellableToggle<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label = "Available for Purchase",
  description = "When enabled, this product can be purchased by customers",
  disabled = false,
  className,
}: FormSellableToggleProps<TFieldValues, TName>) {
  const isDisabled = disabled;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={`flex flex-row items-center justify-between rounded-lg border p-4 ${className}`}>
          <div className="space-y-0.5">
            <FormLabel className="text-base">{label}</FormLabel>
            <div className="text-sm text-muted-foreground">
              {isDisabled
                ? "Variable products are not directly sellable - only their variants can be purchased"
                : description
              }
            </div>
          </div>
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default FormSellableToggle;
