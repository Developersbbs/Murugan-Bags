"use client";

import { useState } from "react";
import { Control, FieldValues, Path, UseFormSetValue } from "react-hook-form";
import { X, Plus } from "lucide-react";

import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type FormTagsInputProps<TFormData extends FieldValues> = {
  control: Control<TFormData>;
  name: Path<TFormData>;
  label: string;
  placeholder?: string;
  setValue: UseFormSetValue<TFormData>;
};

export default function FormTagsInput<TFormData extends FieldValues>({
  control,
  name,
  label,
  placeholder = "Add a tag",
  setValue,
}: FormTagsInputProps<TFormData>) {
  const [inputValue, setInputValue] = useState("");

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const tags = (field.value as string[]) || [];

        const handleAddTag = () => {
          const trimmedValue = inputValue.trim().toLowerCase();
          if (trimmedValue && !tags.includes(trimmedValue)) {
            setValue(name, [...tags, trimmedValue] as any);
            setInputValue("");
          }
        };

        const handleRemoveTag = (tagToRemove: string) => {
          setValue(name, tags.filter(tag => tag !== tagToRemove) as any);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAddTag();
          }
        };

        return (
          <FormItem className="flex flex-col md:flex-row md:gap-x-4 md:space-y-0">
            <FormLabel className="md:flex-shrink-0 md:w-1/4 md:mt-2 leading-snug">
              {label}
            </FormLabel>

            <div className="space-y-3 w-full">
              {/* Display existing tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Input for new tags */}
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddTag}
                  disabled={!inputValue.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <FormMessage />
            </div>
          </FormItem>
        );
      }}
    />
  );
}
