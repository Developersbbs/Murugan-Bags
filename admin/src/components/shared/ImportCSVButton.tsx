"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ImportCSVButtonProps {
    tableName: string;
}

export function ImportCSVButton({ tableName }: ImportCSVButtonProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const queryClient = useQueryClient();

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.csv')) {
            toast.error('Please select a CSV file');
            return;
        }

        setIsImporting(true);
        const toastId = toast.loading(`Importing ${tableName}...`);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/${tableName}/import/csv`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Import failed');
            }

            // Show success message with import stats
            toast.success(
                result.message || `Successfully imported ${result.imported} ${tableName}`,
                { id: toastId }
            );

            // Show errors if any
            if (result.errors && result.errors.length > 0) {
                const errorCount = result.errors.length;
                toast.warning(
                    `${errorCount} row${errorCount > 1 ? 's' : ''} had errors. Check console for details.`,
                    { duration: 5000 }
                );
                console.error('Import errors:', result.errors);
            }

            // Refresh the data
            queryClient.invalidateQueries({ queryKey: [tableName] });

        } catch (error: any) {
            console.error('Import error:', error);
            toast.error(
                error.message || `Failed to import ${tableName}. Please try again.`,
                { id: toastId }
            );
        } finally {
            setIsImporting(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
            />
            <Button
                variant="outline"
                className="h-12"
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload className="mr-2 size-4" />
                {isImporting ? "Importing..." : "Import CSV"}
            </Button>
        </>
    );
}
