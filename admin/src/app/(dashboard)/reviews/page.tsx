"use client";

import { useState, useTransition } from "react";
import { getReviews, updateReviewStatus, deleteReview } from '@/actions/reviews';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

    const handleStatusUpdate = (id: string, newStatus: string) => {
        updateMutation.mutate({ id, status: newStatus });
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this review?")) {
            deleteMutation.mutate(id);
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
                <CardHeader>
                    <CardTitle>Customer Reviews</CardTitle>
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
