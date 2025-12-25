"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package } from "lucide-react";
import { SalesOverview } from "@/services/analytics/types";

interface SalesOverviewCardsProps {
    data: SalesOverview;
}

export default function SalesOverviewCards({ data }: SalesOverviewCardsProps) {
    const cards = [
        {
            title: "Total Revenue",
            value: `₹${(data.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: DollarSign,
            color: "text-green-600",
            bgColor: "bg-green-100",
        },
        {
            title: "Total Orders",
            value: (data.totalOrders || 0).toLocaleString(),
            icon: ShoppingCart,
            color: "text-blue-600",
            bgColor: "bg-blue-100",
        },
        {
            title: "Total Customers",
            value: (data.totalCustomers || 0).toLocaleString(),
            icon: Users,
            color: "text-purple-600",
            bgColor: "bg-purple-100",
        },
        {
            title: "Average Order Value",
            value: `₹${(data.avgOrderValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: Package,
            color: "text-orange-600",
            bgColor: "bg-orange-100",
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {card.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${card.bgColor}`}>
                                <Icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
