"use client";

import { useState, useRef } from "react";
import { Control, FieldValues, Path, useController } from "react-hook-form";
import { Upload, X, Image as ImageIcon } from "lucide-react";

import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FormMultipleImageInputProps<TFormData extends FieldValues> = {
  control: Control<TFormData>;
  name: Path<TFormData>;
  label: string;
  placeholder?: string;
  previewImages?: string[];
  maxImages?: number;
  onRemovePreviewImage?: (index: number) => void;
};

export default function FormMultipleImageInput<TFormData extends FieldValues>({
  control,
  name,
  label,
  placeholder = "Upload product images",
  previewImages = [],
  maxImages = Infinity,
  acceptedTypes = "image/jpeg,image/jpg,image/png,image/webp",
  onRemovePreviewImage,
}: FormMultipleImageInputProps<TFormData>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const {
    field: { value, onChange },
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  const currentImages = value || [];
  const allImages = [...previewImages, ...currentImages];
  const remainingSlots = maxImages === Infinity ? Infinity : maxImages - currentImages.length;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = (files: File[]) => {
    console.log('🖼️ FormMultipleImageInput: handleFiles called with', files.length, 'files');

    const validFiles = files.filter((file) => {
      if (!acceptedTypes.includes(file.type)) {
        console.warn('Skipping file with invalid type:', file.type);
        return false;
      }
      if (file.size > 3 * 1024 * 1024) { // 3MB limit
        console.warn('Skipping file too large:', file.size);
        return false;
      }
      return true;
    });

    const filesToAdd = validFiles.slice(0, remainingSlots);
    console.log('🖼️ FormMultipleImageInput: filesToAdd:', filesToAdd.length);
    console.log('🖼️ FormMultipleImageInput: currentImages before update:', currentImages.length);

    if (filesToAdd.length > 0) {
      const newImages = [...currentImages, ...filesToAdd];
      console.log('🖼️ FormMultipleImageInput: Calling onChange with', newImages.length, 'images');
      onChange(newImages);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const removeImage = (index: number) => {
    const newImages = currentImages.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const canAddMore = currentImages.length < maxImages || maxImages === Infinity;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col md:flex-row md:gap-x-4 md:space-y-0">
          <FormLabel className="md:flex-shrink-0 md:w-1/4 md:mt-2 leading-snug">
            {label}
          </FormLabel>

          <div className="space-y-4 w-full">
            {/* Upload Area */}
            {canAddMore && (
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                  "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-primary">Click to upload</span> or drag and drop
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, WEBP up to 3MB each {maxImages === Infinity ? "" : `(${remainingSlots} remaining)`}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={acceptedTypes}
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            )}

            {/* Image Preview Grid */}
            {allImages.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {allImages.length} image{allImages.length !== 1 ? 's' : ''} uploaded
                </div>
                <div className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-muted/20">
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {/* Existing Preview Images */}
                    {previewImages.map((imageUrl, index) => (
                      <div key={`preview-${index}`} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                          <img
                            src={imageUrl}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-medium">Existing</span>
                        </div>
                        {onRemovePreviewImage && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemovePreviewImage(index);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}

                    {/* New Uploaded Images */}
                    {currentImages.map((file: File, index: number) => (
                      <div key={`new-${index}`} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <FormControl>
              {/* Don't spread field props for file inputs as they can't have their value set programmatically */}
              <input type="hidden" name={field.name} value="" />
            </FormControl>

            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}
