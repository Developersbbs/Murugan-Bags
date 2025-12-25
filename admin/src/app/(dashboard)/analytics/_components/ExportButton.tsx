"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonProps {
    onExport: () => Promise<void>;
    filename?: string;
    disabled?: boolean;
}

export default function ExportButton({
    onExport,
    filename = "export",
    disabled = false,
}: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();

    const handleExport = async () => {
        try {
            setIsExporting(true);
            await onExport();
            toast({
                title: "Export successful",
                description: `${filename}.csv has been downloaded`,
            });
        } catch (error) {
            console.error("Export error:", error);
            toast({
                title: "Export failed",
                description: "Failed to export data. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button
            onClick={handleExport}
            disabled={disabled || isExporting}
            variant="outline"
            size="sm"
        >
            {isExporting ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                </>
            ) : (
                <>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </>
            )}
        </Button>
    );
}
