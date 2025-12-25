"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
    startDate?: Date;
    endDate?: Date;
    onDateChange: (startDate?: Date, endDate?: Date) => void;
}

export default function DateRangePicker({
    startDate,
    endDate,
    onDateChange,
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const presets = [
        {
            label: "Today",
            getValue: () => {
                const today = new Date();
                return { start: today, end: today };
            },
        },
        {
            label: "Last 7 days",
            getValue: () => {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - 7);
                return { start, end };
            },
        },
        {
            label: "Last 30 days",
            getValue: () => {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - 30);
                return { start, end };
            },
        },
        {
            label: "This month",
            getValue: () => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                return { start, end };
            },
        },
        {
            label: "Last month",
            getValue: () => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const end = new Date(now.getFullYear(), now.getMonth(), 0);
                return { start, end };
            },
        },
        {
            label: "This year",
            getValue: () => {
                const now = new Date();
                const start = new Date(now.getFullYear(), 0, 1);
                const end = new Date(now.getFullYear(), 11, 31);
                return { start, end };
            },
        },
    ];

    const handlePresetClick = (preset: typeof presets[0]) => {
        const { start, end } = preset.getValue();
        onDateChange(start, end);
        setIsOpen(false);
    };

    const handleClear = () => {
        onDateChange(undefined, undefined);
        setIsOpen(false);
    };

    const displayText = () => {
        if (startDate && endDate) {
            return `${format(startDate, "MMM dd, yyyy")} - ${format(endDate, "MMM dd, yyyy")}`;
        }
        if (startDate) {
            return `From ${format(startDate, "MMM dd, yyyy")}`;
        }
        if (endDate) {
            return `Until ${format(endDate, "MMM dd, yyyy")}`;
        }
        return "Select date range";
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "justify-start text-left font-normal",
                        !startDate && !endDate && "text-muted-foreground"
                    )}
                >
                    <Calendar className="mr-2 h-4 w-4" />
                    {displayText()}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="flex">
                    <div className="border-r p-3 space-y-2">
                        <div className="text-sm font-medium mb-2">Presets</div>
                        {presets.map((preset) => (
                            <Button
                                key={preset.label}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => handlePresetClick(preset)}
                            >
                                {preset.label}
                            </Button>
                        ))}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-destructive"
                            onClick={handleClear}
                        >
                            Clear
                        </Button>
                    </div>
                    <div className="p-3">
                        <div className="text-sm font-medium mb-2">Custom Range</div>
                        <div className="space-y-3">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Start Date</div>
                                <CalendarComponent
                                    mode="single"
                                    selected={startDate}
                                    onSelect={(date) => onDateChange(date, endDate)}
                                    initialFocus
                                />
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">End Date</div>
                                <CalendarComponent
                                    mode="single"
                                    selected={endDate}
                                    onSelect={(date) => onDateChange(startDate, date)}
                                    disabled={(date) => startDate ? date < startDate : false}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
