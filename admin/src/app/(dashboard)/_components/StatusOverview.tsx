"use client";

import { useQuery } from "@tanstack/react-query";
import {
  HiOutlineShoppingCart,
  HiOutlineRefresh,
  HiOutlineCheck,
} from "react-icons/hi";
import { BsTruck } from "react-icons/bs";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import Typography from "@/components/ui/typography";
import { DashboardCard } from "@/types/card";
import { getDashboardSummary } from "@/services/analytics";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatusOverview() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });

  const cards: DashboardCard[] = [
    {
      icon: <HiOutlineShoppingCart />,
      title: "Total Orders",
      value: isLoading ? "..." : (summary?.statusCounts?.total || 0).toString(),
      className:
        "text-orange-600 dark:text-orange-100 bg-orange-100 dark:bg-orange-500",
    },
    {
      icon: <HiOutlineRefresh />,
      title: "Orders Pending",
      value: isLoading ? "..." : (summary?.statusCounts?.pending || 0).toString(),
      className:
        "text-teal-600 dark:text-teal-100 bg-teal-100 dark:bg-teal-500",
    },
    {
      icon: <BsTruck />,
      title: "Orders Processing",
      value: isLoading ? "..." : (summary?.statusCounts?.processing || 0).toString(),
      className:
        "text-blue-600 dark:text-blue-100 bg-blue-100 dark:bg-blue-500",
    },
    {
      icon: <HiOutlineCheck />,
      title: "Orders Delivered",
      value: isLoading ? "..." : (summary?.statusCounts?.delivered || 0).toString(),
      className:
        "text-emerald-600 dark:text-emerald-100 bg-emerald-100 dark:bg-emerald-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="flex items-center gap-3 p-0">
            <div
              className={cn(
                "size-12 rounded-full grid place-items-center [&>svg]:size-5",
                card.className
              )}
            >
              {card.icon}
            </div>

            <div className="flex flex-col gap-y-1">
              <Typography className="text-sm text-muted-foreground">
                {card.title}
              </Typography>

              <Typography className="text-2xl font-semibold text-popover-foreground">
                {card.value}
              </Typography>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
