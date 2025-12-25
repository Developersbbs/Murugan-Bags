"use client";

import { useQuery } from "@tanstack/react-query";
import { HiOutlineRefresh } from "react-icons/hi";
import { HiOutlineSquare3Stack3D, HiCalendarDays } from "react-icons/hi2";

import { cn, formatCurrency } from "@/lib/utils";
import Typography from "@/components/ui/typography";
import { DashboardCard } from "@/types/card";
import { getDashboardSummary } from "@/services/analytics";
import { Skeleton } from "@/components/ui/skeleton";

export default function SalesOverview() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });

  const cards: DashboardCard[] = [
    {
      icon: <HiOutlineSquare3Stack3D />,
      title: "Today Orders",
      value: isLoading ? "..." : formatCurrency(summary?.today?.totalRevenue || 0),
      className: "bg-teal-600",
    },
    {
      icon: <HiOutlineSquare3Stack3D />,
      title: "Yesterday Orders",
      value: isLoading ? "..." : formatCurrency(summary?.yesterday?.totalRevenue || 0),
      className: "bg-orange-400",
    },
    {
      icon: <HiOutlineRefresh />,
      title: "This Month",
      value: isLoading ? "..." : formatCurrency(summary?.thisMonth?.totalRevenue || 0),
      className: "bg-blue-500",
    },
    {
      icon: <HiCalendarDays />,
      title: "Last Month",
      value: isLoading ? "..." : formatCurrency(summary?.lastMonth?.totalRevenue || 0),
      className: "bg-cyan-600",
    },
    {
      icon: <HiCalendarDays />,
      title: "All-Time Sales",
      value: isLoading ? "..." : formatCurrency(summary?.allTime?.totalRevenue || 0),
      className: "bg-emerald-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-2">
        {[...Array(5)].map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-2">
      {cards.map((card, index) => (
        <div
          key={`sales-overview-${index}`}
          className={cn(
            "p-6 rounded-lg flex flex-col items-center justify-center space-y-3 text-white text-center",
            card.className
          )}
        >
          <div className="[&>svg]:size-8">{card.icon}</div>

          <Typography className="text-base">{card.title}</Typography>

          <Typography className="text-2xl font-semibold">
            {card.value}
          </Typography>
        </div>
      ))}
    </div>
  );
}
