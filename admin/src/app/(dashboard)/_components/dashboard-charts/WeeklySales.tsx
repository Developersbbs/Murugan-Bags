"use client";

import { Line } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Typography from "@/components/ui/typography";
import useGetMountStatus from "@/hooks/use-get-mount-status";
import { getDashboardSummary } from "@/services/analytics";

export default function WeeklySales() {
  const { theme } = useTheme();
  const mounted = useGetMountStatus();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });

  const gridColor = `rgba(161, 161, 170, ${theme === "light" ? "0.5" : "0.3"})`;

  const salesData = summary?.weeklySales?.map(item => item.sales) || [];
  const ordersData = summary?.weeklySales?.map(item => item.orders) || [];
  const labels = summary?.weeklySales?.map(item => {
    const date = new Date(item.date);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }) || [];

  if (isLoading) {
    return (
      <Card>
        <Typography variant="h3" className="mb-4">
          Weekly Sales
        </Typography>
        <CardContent className="pb-2">
          <Skeleton className="h-[21rem] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Typography variant="h3" className="mb-4">
        Weekly Sales
      </Typography>

      <CardContent className="pb-2">
        <Tabs defaultValue="sales">
          <TabsList className="mb-6">
            <TabsTrigger
              value="sales"
              className="data-[state=active]:text-primary"
            >
              Sales
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:text-orange-500"
            >
              Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="relative h-60">
            {mounted ? (
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Sales",
                      data: salesData,
                      borderColor: "rgb(34, 197, 94)",
                      backgroundColor: "rgb(34, 197, 94)",
                      tension: 0.3,
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      grid: {
                        color: gridColor,
                      },
                      border: {
                        color: gridColor,
                      },
                      ticks: {
                        callback: function (value) {
                          return "₹" + value;
                        },
                        padding: 4,
                      },
                      beginAtZero: true,
                    },
                    x: {
                      grid: {
                        display: false,
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) =>
                          `${context.dataset.label}: ₹${context.parsed.y}`,
                      },
                    },
                  },
                }}
              />
            ) : (
              <Skeleton className="size-full" />
            )}
          </TabsContent>

          <TabsContent value="orders" className="relative h-60">
            {mounted ? (
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Orders",
                      data: ordersData,
                      borderColor: "rgb(249, 115, 22)",
                      backgroundColor: "rgb(249, 115, 22)",
                      tension: 0.3,
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      grid: {
                        color: gridColor,
                      },
                      border: {
                        color: gridColor,
                      },
                      ticks: {
                        stepSize: 1,
                        padding: 4,
                      },
                      beginAtZero: true,
                    },
                    x: {
                      grid: {
                        display: false,
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                }}
              />
            ) : (
              <Skeleton className="size-full" />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
