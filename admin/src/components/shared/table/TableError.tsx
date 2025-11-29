import { AlertCircle, RefreshCw, FileX } from "lucide-react";
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import Typography from "@/components/ui/typography";

type TableErrorProps<TData> = {
  title?: string;
  description?: string;
  buttonText?: string;
  errorMessage?: string;
  variant?: "error" | "empty";
  refetch?: () => void;
};

export default function TableError<TData>({
  title = "Something went wrong",
  description = "Something went wrong while trying to fetch data.",
  buttonText = "Retry",
  errorMessage,
  variant = "error",
  refetch,
}: TableErrorProps<TData>) {
  const isError = variant === "error";
  const isEmpty = variant === "empty";

  return (
    <div className={`rounded-md overflow-hidden ${isError ? 'border-destructive border-2' : 'border-border'}`}>
      <div className="px-4 py-12 min-h-60 text-center grid place-items-center">
        <div className={`flex flex-col items-center gap-4 ${isError ? 'text-destructive' : 'text-muted-foreground'}`}>
          {isError ? (
            <AlertCircle className="size-7" />
          ) : (
            <FileX className="size-7" />
          )}

          <div className="text-center">
            <Typography variant="h4" className="mb-2">{title}</Typography>
            <Typography>{errorMessage || description}</Typography>
          </div>

          {refetch && (
            <Button
              onClick={() => refetch()}
              variant={isError ? "destructive" : "outline"}
              className="py-3 px-8 mt-2"
            >
              <RefreshCw className="size-4 mr-2" />
              {buttonText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
