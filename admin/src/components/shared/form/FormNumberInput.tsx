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

type FormNumberInputProps<TFormData extends FieldValues> = {
  control: Control<TFormData>;
  name: Path<TFormData>;
  label: string;
  placeholder: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
};

export default function FormNumberInput<TFormData extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  min,
  max,
  step,
  className,
}: FormNumberInputProps<TFormData>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={`flex flex-col md:flex-row md:gap-x-4 md:space-y-0 ${className}`}>
          <FormLabel className="md:flex-shrink-0 md:w-1/4 md:mt-2 leading-snug">
            {label}
          </FormLabel>

          <div className="space-y-2 w-full">
            <FormControl>
              <Input
                {...field}
                type="number"
                placeholder={placeholder}
                min={min}
                max={max}
                step={step}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : "")}
                className="md:w-full"
              />
            </FormControl>
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}
