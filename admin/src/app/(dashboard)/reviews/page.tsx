"use client";

import { useState, useTransition } from "react";
import { getReviews, updateReviewStatus, deleteReview, bulkUpdateReviewStatus, bulkDeleteReviews } from '@/actions/reviews';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Check, X, Trash2, Star } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import PageTitle from "@/components/shared/PageTitle";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function ReviewsPage() {
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['reviews', page, statusFilter],
        queryFn: () => getReviews({ page, status: statusFilter !== 'all' ? statusFilter : undefined })
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: string }) => updateReviewStatus(id, status),
        onSuccess: () => {
            toast.success("Review status updated");
            queryClient.invalidateQueries({ queryKey: ['reviews'] });
        },
        onError: (err: any) => toast.error(err.message || "Update failed")
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteReview(id),
        onSuccess: () => {
            toast.success("Review deleted");
            queryClient.invalidateQueries({ queryKey: ['reviews'] });
        },
        onError: (err: any) => toast.error(err.message || "Delete failed")
    });

    const bulkUpdateMutation = useMutation({
        mutationFn: ({ ids, status }: { ids: string[], status: string }) => bulkUpdateReviewStatus(ids, status),
        onSuccess: (data) => {
            toast.success(data.message || "Bulk update successful");
            queryClient.invalidateQueries({ queryKey: ['reviews'] });
            setSelectedIds([]); // Clear selection
        },
        onError: (err: any) => toast.error(err.message || "Bulk update failed")
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: (ids: string[]) => bulkDeleteReviews(ids),
        onSuccess: (data) => {
            toast.success(data.message || "Bulk delete successful");
            queryClient.invalidateQueries({ queryKey: ['reviews'] });
            setSelectedIds([]); // Clear selection
        },
        onError: (err: any) => toast.error(err.message || "Bulk delete failed")
    });

    const handleStatusUpdate = (id: string, newStatus: string) => {
        updateMutation.mutate({ id, status: newStatus });
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this review?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked && data?.data) {
            setSelectedIds(data.data.map((r: any) => r._id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(itemId => itemId !== id));
        }
    };

    const handleBulkAction = (action: 'approve' | 'reject' | 'delete') => {
        if (selectedIds.length === 0) return;

        if (action === 'approve') {
            bulkUpdateMutation.mutate({ ids: selectedIds, status: 'approved' });
        } else if (action === 'reject') {
            bulkUpdateMutation.mutate({ ids: selectedIds, status: 'rejected' });
        } else if (action === 'delete') {
            if (confirm(`Are you sure you want to delete ${selectedIds.length} reviews?`)) {
                bulkDeleteMutation.mutate(selectedIds);
            }
        }
    };

    return (
        <section className="p-6">
            <PageTitle>Product Reviews</PageTitle>

            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Customer Reviews</CardTitle>
                    {selectedIds.length > 0 && (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => handleBulkAction('approve')}
                                disabled={bulkUpdateMutation.isPending}
                            >
                                <Check className="mr-2 h-4 w-4" /> Approve ({selectedIds.length})
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleBulkAction('reject')}
                                disabled={bulkUpdateMutation.isPending}
                            >
                                <X className="mr-2 h-4 w-4" /> Reject ({selectedIds.length})
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleBulkAction('delete')}
                                disabled={bulkDeleteMutation.isPending}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedIds.length})
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="animate-spin h-8 w-8" />
                        </div>
                    ) : !data?.data || data.data.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            No reviews found.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={data.data.length > 0 && selectedIds.length === data.data.length}
                                            onCheckedChange={handleSelectAll}
                                            aria-label="Select all"
                                        />
                                    </TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Review</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.data.map((review: any) => (
                                    <TableRow key={review._id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.includes(review._id)}
                                                onCheckedChange={(checked) => handleSelectOne(review._id, checked as boolean)}
                                                aria-label={`Select review for ${review.product_id?.name}`}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {review.product_id?.image_url?.[0] && (
                                                    <img
                                                        src={review.product_id.image_url[0]}
                                                        alt=""
                                                        className="w-8 h-8 rounded object-cover"
                                                    />
                                                )}
                                                <span className="max-w-[150px] truncate" title={review.product_id?.name}>
                                                    {review.product_id?.name || 'Unknown Product'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {review.customer_id?.name || 'Anonymous'}
                                            <div className="text-xs text-muted-foreground">{review.customer_id?.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex text-yellow-500">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-4 h-4 ${i < review.rating ? "fill-current" : "text-gray-300"}`}
                                                    />
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-xs">
                                            <p className="truncate text-sm" title={review.review}>{review.review}</p>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                review.status === 'approved' ? 'default' :
                                                    review.status === 'rejected' ? 'destructive' :
                                                        'outline'
                                            }>
                                                {review.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {review.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                            onClick={() => handleStatusUpdate(review._id, 'approved')}
                                                            title="Approve"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleStatusUpdate(review._id, 'rejected')}
                                                            title="Reject"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                {review.status === 'rejected' && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => handleStatusUpdate(review._id, 'approved')}
                                                        title="Approve"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {review.status === 'approved' && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleStatusUpdate(review._id, 'rejected')}
                                                        title="Reject"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDelete(review._id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {/* Pagination Controls could go here */}

                </CardContent>
            </Card>
        </section>
    );
}
