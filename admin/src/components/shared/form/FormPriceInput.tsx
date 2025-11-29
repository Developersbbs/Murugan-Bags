import { Control, FieldValues, Path } from "react-hook-form";

import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type FormPriceInputProps<TFormData extends FieldValues> = {
  control: Control<TFormData>;
  name: Path<TFormData>;
  label: string;
  placeholder: string;
  min?: string | number;
};

function FormPriceInput<TFormData extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  min = "0",
}: FormPriceInputProps<TFormData>) {
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
                <div className="absolute top-0 left-0 border-r border-r-input px-3 h-12 w-10 grid place-items-center text-lg rounded-l-md">
                  <span>₹</span>
                </div>

                <Input
                  type="number"
                  min={min}
                  className="h-12 pl-14"
                  onFocus={(e) => e.target.select()}
                  placeholder={placeholder}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = value === '' ? undefined : parseFloat(value) || 0;
                    field.onChange(numValue);
                  }}
                />
              </div>
            </FormControl>

            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

export default FormPriceInput;
