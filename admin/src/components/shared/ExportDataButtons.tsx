"use client";

import { useTransition } from "react";
import { FileJson, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportAsCSV, exportAsJSON } from "@/helpers/exportData";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type SuccessResponse = { data: any[] };
type ErrorResponse = { error: string };
type ActionResponse = SuccessResponse | ErrorResponse;

type Props = {
  tableName: string; // The name of the table/resource (e.g., 'categories', 'products', 'customers')
  action: () => Promise<ActionResponse>;
};

export function ExportDataButtons({ tableName, action }: Props) {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    const toastId = toast.loading(`Exporting ${tableName} as ${format.toUpperCase()}...`);
    
    try {
      // Build query params from current search params
      const params = new URLSearchParams();
      
      // Add all current search params to the export request
      searchParams.forEach((value, key) => {
        params.set(key, value);
      });

      // Make request to the backend export endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/${tableName}/export/${format}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableName}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${tableName} exported successfully!`, { id: toastId });
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${tableName}. Please try again.`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        className="h-12"
        disabled={isExporting}
        onClick={() => handleExport("csv")}
      >
        <FileSpreadsheet className="mr-2 size-4" />
        {isExporting ? "Exporting..." : "Export CSV"}
      </Button>

      <Button
        variant="outline"
        className="h-12"
        disabled={isExporting}
        onClick={() => handleExport("json")}
      >
        <FileJson className="mr-2 size-4" />
        {isExporting ? "Exporting..." : "Export JSON"}
      </Button>
    </div>
  );
}
