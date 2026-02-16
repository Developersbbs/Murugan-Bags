"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Download, Filter, X, AlertCircle, TrendingUp, ShoppingCart, Heart, User } from "lucide-react";
import { DateRange } from "react-day-picker";

import { getWishlistCartStats, getProductInterestDetails, ReportParams } from "@/services/reports/reportService";
import { fetchCategoriesDropdown } from "@/services/categories";
import { CategoryDropdown } from "@/types/api";

import PageTitle from "@/components/shared/PageTitle";
import { Loading } from "@/components/shared/Loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ReportItem {
    _id: string;
    name: string;
    image: string;
    price: number;
    discounted_price: number;
    inWishlists: number;
    inCarts: number;
    totalInterest: number;
}

interface UserDetail {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    quantity?: number; // For cart items
}

interface InterestDetails {
    wishlistUsers: UserDetail[];
    cartUsers: UserDetail[];
}

export default function WishlistCartReportPage() {
    const [data, setData] = useState<ReportItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [minPrice, setMinPrice] = useState<string>("");
    const [maxPrice, setMaxPrice] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [categories, setCategories] = useState<CategoryDropdown[]>([]);

    // Modal state
    const [selectedProduct, setSelectedProduct] = useState<ReportItem | null>(null);
    const [interestDetails, setInterestDetails] = useState<InterestDetails | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch Categories on mount
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const cats = await fetchCategoriesDropdown();
                setCategories(cats);
            } catch (err) {
                console.error("Failed to load categories", err);
            }
        };
        loadCategories();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const params: ReportParams = {};
            if (dateRange?.from) params.startDate = dateRange.from;
            if (dateRange?.to) params.endDate = dateRange.to;
            if (minPrice) params.minPrice = minPrice;
            if (maxPrice) params.maxPrice = maxPrice;
            if (selectedCategory && selectedCategory !== "all") params.categoryId = selectedCategory;

            const result = await getWishlistCartStats(params);
            if (result.data) {
                setData(result.data);
            } else {
                setData([]);
            }

        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    const handleApplyFilters = () => {
        fetchData();
    };

    const handleClearFilters = () => {
        setDateRange(undefined);
        setMinPrice("");
        setMaxPrice("");
        setSelectedCategory("all");
        // We typically want to refetch after clearing, can be done via effect or explicit call.
        // Let's do explicit call but we need to pass empty params, state update is async.
        // Better to just update state and let user click Apply, or trigger fetch. 
        // For better UX, let's trigger fetch with cleared params.

        // However, since state setters are async, fetchData would use old state if called immediately.
        // So we will just reset state and the user will have to click Apply again? 
        // Or we can modify fetchData to accept overrides.
        // Simplest: just reload window or just manually call service with empty object.

        // Let's just reset state and let user click Apply for now to avoid complexity, 
        // OR use a useEffect that watches a 'trigger' but that gets messy.
        // Actually, let's just create a separate function or use setTimeout (hacky).
        // Let's go with: Reset state, then call API with empty params directly.

        getWishlistCartStats({}).then(result => {
            if (result.data) setData(result.data);
            setLoading(false);
        }).catch(err => setError(err.message));
    };

    const handleProductClick = async (product: ReportItem) => {
        try {
            setSelectedProduct(product);
            setIsModalOpen(true);
            setDetailsLoading(true);
            setDetailsError(null);
            setInterestDetails(null);

            const result = await getProductInterestDetails(product._id);
            if (result.success && result.data) {
                setInterestDetails(result.data);
            } else {
                setDetailsError("Failed to load details");
            }
        } catch (err: any) {
            setDetailsError(err.message || "Failed to fetch details");
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (!data || data.length === 0) return;

        // Define CSV headers
        const headers = ["Product Name", "Price", "Discounted Price", "In Wishlists", "In Carts", "Total Interest"];

        // Convert data to CSV rows
        const rows = data.map(item => [
            `"${item.name.replace(/"/g, '""')}"`, // Escape quotes
            item.price,
            item.discounted_price,
            item.inWishlists,
            item.inCarts,
            item.totalInterest
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        // Create download link
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `wishlist_cart_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading && data.length === 0) return <Loading />; // Only full screen load on first load

    // Calculate summaries
    const totalWishlistItems = data.reduce((sum, item) => sum + item.inWishlists, 0);
    const totalCartItems = data.reduce((sum, item) => sum + item.inCarts, 0);
    const totalInterest = totalWishlistItems + totalCartItems;

    const handleExportDetailsCSV = () => {
        if (!interestDetails || !selectedProduct) return;

        const headers = ["User Name", "Email", "Phone", "Type", "Quantity"];
        const rows: any[] = [];

        // Add Wishlist Users
        interestDetails.wishlistUsers.forEach(user => {
            rows.push([
                `"${user.name.replace(/"/g, '""')}"`,
                user.email || "",
                user.phone || "",
                "Wishlist",
                "1"
            ]);
        });

        // Add Cart Users
        interestDetails.cartUsers.forEach(user => {
            rows.push([
                `"${user.name.replace(/"/g, '""')}"`,
                user.email || "",
                user.phone || "",
                "Cart",
                user.quantity || "1"
            ]);
        });

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${selectedProduct.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_interest_details.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <PageTitle>Wishlist & Cart Reports</PageTitle>
                <Button variant="outline" onClick={handleExportCSV} disabled={data.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Filter className="h-4 w-4" /> Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        {/* Date Range Picker */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date Added Range</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dateRange && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                                    {format(dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(dateRange.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Category Select */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat._id} value={cat._id}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Price Range */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Price Range</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Min"
                                    type="number"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                />
                                <Input
                                    placeholder="Max"
                                    type="number"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <Button className="flex-1" onClick={handleApplyFilters}>
                                Apply
                            </Button>
                            <Button variant="ghost" onClick={handleClearFilters}>
                                Clear
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Interest</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalInterest}</div>
                        <p className="text-xs text-muted-foreground">
                            Combined items in wishlists and carts
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Wishlists</CardTitle>
                        <Heart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalWishlistItems}</div>
                        <p className="text-xs text-muted-foreground">
                            Total items currently in user wishlists
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Carts</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCartItems}</div>
                        <p className="text-xs text-muted-foreground">
                            Total items currently in user carts
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Image</TableHead>
                                <TableHead>Product Name</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead className="text-center">In Wishlists</TableHead>
                                <TableHead className="text-center">In Carts</TableHead>
                                <TableHead className="text-right">Total Interest</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <Loading />
                                    </TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4">
                                        No data available
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item) => (
                                    <TableRow
                                        key={item._id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleProductClick(item)}
                                    >
                                        <TableCell>
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="h-10 w-10 object-cover rounded"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center text-xs">
                                                    No Img
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium text-blue-600 hover:underline">
                                            {item.name}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold">₹{item.discounted_price}</span>
                                                {item.price > item.discounted_price && (
                                                    <span className="text-xs line-through text-muted-foreground">
                                                        ₹{item.price}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-medium text-pink-600">
                                            {item.inWishlists}
                                        </TableCell>
                                        <TableCell className="text-center font-medium text-blue-600">
                                            {item.inCarts}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {item.totalInterest}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Drill-down Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle>Interest Details: {selectedProduct?.name}</DialogTitle>
                            <Button variant="outline" size="sm" onClick={handleExportDetailsCSV} disabled={!interestDetails}>
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                        </div>
                    </DialogHeader>

                    {detailsLoading ? (
                        <div className="flex justify-center py-8">
                            <Loading />
                        </div>
                    ) : detailsError ? (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{detailsError}</AlertDescription>
                        </Alert>
                    ) : interestDetails ? (
                        <div className="grid md:grid-cols-2 gap-6 mt-4">
                            {/* Wishlist Users Column */}
                            <div className="border rounded-lg p-4 bg-pink-50/50">
                                <div className="flex items-center gap-2 mb-4">
                                    <Heart className="h-5 w-5 text-pink-600" />
                                    <h3 className="font-semibold text-lg text-pink-900">In Wishlists ({interestDetails.wishlistUsers.length})</h3>
                                </div>
                                {interestDetails.wishlistUsers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No users found</p>
                                ) : (
                                    <div className="space-y-3">
                                        {interestDetails.wishlistUsers.map((user) => (
                                            <div key={user._id} className="flex items-start gap-3 bg-white p-3 rounded shadow-sm">
                                                <div className="bg-pink-100 p-2 rounded-full">
                                                    <User className="h-4 w-4 text-pink-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{user.name}</p>
                                                    {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                                                    {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Cart Users Column */}
                            <div className="border rounded-lg p-4 bg-blue-50/50">
                                <div className="flex items-center gap-2 mb-4">
                                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                                    <h3 className="font-semibold text-lg text-blue-900">In Carts ({interestDetails.cartUsers.length})</h3>
                                </div>
                                {interestDetails.cartUsers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No users found</p>
                                ) : (
                                    <div className="space-y-3">
                                        {interestDetails.cartUsers.map((user) => (
                                            <div key={user._id} className="flex items-start gap-3 bg-white p-3 rounded shadow-sm">
                                                <div className="bg-blue-100 p-2 rounded-full">
                                                    <User className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="flex justify-between items-start w-full">
                                                        <p className="font-medium text-sm">{user.name}</p>
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                                            Qty: {user.quantity}
                                                        </span>
                                                    </div>
                                                    {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                                                    {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
