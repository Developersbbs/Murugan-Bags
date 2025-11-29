import { Control, FieldValues, Path } from "react-hook-form";

import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FormTextInputProps<TFormData extends FieldValues> = {
  control: Control<TFormData>;
  name: Path<TFormData>;
  label: string;
  placeholder: string;
  type?: React.HTMLInputTypeAttribute;
  readOnly?: boolean;
  className?: string;
  transform?: 'uppercase' | 'lowercase' | 'none';
  min?: string | number;
  max?: string | number;
  step?: string | number;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
};

function FormTextInput<TFormData extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type,
  readOnly,
  className,
  transform = 'none',
  min,
  max,
  step,
  onChange,
  accept,
}: FormTextInputProps<TFormData>) {
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
              {type === "file" ? (
                <Input
                  className={cn("h-12", className)}
                  type="file"
                  readOnly={readOnly}
                  placeholder={placeholder}
                  accept={accept}
                  onChange={(e) => {
                    // Call custom onChange handler if provided
                    onChange?.(e);
                    // Also update react-hook-form field
                    field.onChange(e.target.files?.[0] || null);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              ) : (
                <Input
                  className={cn("h-12", className)}
                  type={type}
                  readOnly={readOnly}
                  placeholder={placeholder}
                  min={min}
                  max={max}
                  step={step}
                  onFocus={
                    type === "number" ? (e) => e.target.select() : undefined
                  }
                  value={
                    type === "number"
                      ? (field.value !== undefined && field.value !== null ? Number(field.value) : '')
                      : transform === 'uppercase' ? (field.value || '').toUpperCase() :
                    transform === 'lowercase' ? (field.value || '').toLowerCase() :
                    field.value || ''
                  }
                  onChange={(e) => {
                    let value = e.target.value;
                    if (transform === 'uppercase') {
                      value = value.toUpperCase();
                    } else if (transform === 'lowercase') {
                      value = value.toLowerCase();
                    }
                    // Ensure the field value is updated with the transformed value
                    field.onChange(value);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              )}
            </FormControl>

            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

export default FormTextInput;
