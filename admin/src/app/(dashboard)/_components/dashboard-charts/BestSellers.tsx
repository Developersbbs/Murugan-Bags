"use client";

import { Pie } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Typography from "@/components/ui/typography";
import useGetMountStatus from "@/hooks/use-get-mount-status";
import { getDashboardSummary } from "@/services/analytics";

export default function BestSellers() {
  const mounted = useGetMountStatus();
  const { theme } = useTheme();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });

  const labels = summary?.bestSellers?.map(item => item.name) || [];
  const data = summary?.bestSellers?.map(item => item.units) || [];

  if (isLoading) {
    return (
      <Card>
        <Typography variant="h3" className="mb-4">
          Best Selling Products
        </Typography>
        <CardContent className="pb-2">
          <Skeleton className="h-[18.625rem] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Typography variant="h3" className="mb-4">
        Best Selling Products
      </Typography>

      <CardContent className="pb-2">
        <div className="relative h-[18.625rem]">
          {mounted && data.length > 0 ? (
            <Pie
              data={{
                labels,
                datasets: [
                  {
                    label: "Units Sold",
                    data: data,
                    backgroundColor: [
                      "rgb(34, 197, 94)",
                      "rgb(59, 130, 246)",
                      "rgb(249, 115, 22)",
                      "rgb(99, 102, 241)",
                      "rgb(236, 72, 153)",
                    ],
                    borderColor:
                      theme === "light" ? "rgb(255,255,255)" : "rgb(23,23,23)",
                    borderWidth: 2,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      boxWidth: 12,
                      padding: 20,
                    }
                  }
                }
              }}
            />
          ) : mounted && data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No sales data available
            </div>
          ) : (
            <Skeleton className="size-full" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
