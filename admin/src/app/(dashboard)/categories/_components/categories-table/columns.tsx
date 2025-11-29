import { PenSquare, Trash2, Eye } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import Typography from "@/components/ui/typography";

import { TableSwitch } from "@/components/shared/table/TableSwitch";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { SheetTooltip, TooltipWrapper } from "@/components/shared/table/TableActionTooltip";
import { TableActionAlertDialog } from "@/components/shared/table/TableActionAlertDialog";
import CategoryFormSheet from "../form/CategoryFormSheet";
import { Category } from "@/services/categories/types";
import { SkeletonColumn } from "@/types/skeleton";

import { editCategory } from "@/actions/categories/editCategory";
import { deleteCategory } from "@/actions/categories/deleteCategory";
import { toggleCategoryPublishedStatus } from "@/actions/categories/toggleCategoryStatus";
import { HasPermission } from "@/hooks/use-authorization";
import { useRouter } from "next/navigation";

export const getColumns = ({
  hasPermission,
}: {
  hasPermission: HasPermission;
}) => {
  const router = useRouter();
  
  const columns: ColumnDef<Category>[] = [
    {
      header: "icon",
      cell: ({ row }) => {
        // Handle null/undefined image_url
        if (!row.original.image_url) {
          return (
            <div className="size-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 text-xs">N/A</span>
            </div>
          );
        }
        
        return (
          <ImagePlaceholder
            src={row.original.image_url}
            alt={row.original.name}
            width={32}
            height={32}
            className="size-8 rounded-full"
          />
        );
      },
    },
    {
      header: "name",
      cell: ({ row }) => row.original.name,
    },
    {
      header: "description",
      cell: ({ row }) => (
        <Typography className="block max-w-md xl:max-w-lg truncate">
          {row.original.description}
        </Typography>
      ),
    },
    {
      header: "subcategories",
      cell: ({ row }) => {
        const subcategories = row.original.subcategories || [];
        if (subcategories.length === 0) {
          return <Typography className="text-gray-500">No subcategories</Typography>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {subcategories.map((sub, index) => (
              <div key={sub._id || index} className="inline-flex items-center bg-gray-100 rounded-full px-2.5 py-0.5 text-xs text-black">
                {sub.name}
              </div>
            ))}
            {subcategories.length > 3 && (
              <div className="inline-flex items-center bg-gray-100 rounded-full px-2.5 py-0.5 text-xs text-black">
                +{subcategories.length - 3} more
              </div>
            )}
          </div>
        );
      },
    },
  ];

  if (hasPermission("categories", "canTogglePublished")) {
    columns.splice(4, 0, {
      header: "published",
      cell: ({ row }) => (
        <div className="pl-5">
          <TableSwitch
            checked={row.original.published}
            toastSuccessMessage="Category status updated successfully."
            queryKey="categories"
            onCheckedChange={() =>
              toggleCategoryPublishedStatus(
                row.original._id,
                row.original.published
              )
            }
          />
        </div>
      ),
    });
  }

  if (
    hasPermission("categories", "canDelete") ||
    hasPermission("categories", "canEdit")
  ) {
    columns.splice(0, 0, {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
    });

    columns.splice(5, 0, {
      header: "actions",
      cell: ({ row }) => {
        const router = useRouter();
        return (
          <div className="flex items-center gap-1">
            {/* View Products Action */}
            <TooltipWrapper content="View Products">
              <button
                onClick={() => router.push(`/products?category=${row.original.slug}`)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Eye className="size-5 text-gray-600" />
              </button>
            </TooltipWrapper>

            {hasPermission("categories", "canEdit") && (
              <CategoryFormSheet
                key={row.original.id}
                title="Update Category"
                description="Update necessary category information here"
                submitButtonText="Update Category"
                actionVerb="updated"
                initialData={{
                  name: row.original.name,
                  description: row.original.description ?? "",
                  image: row.original.image_url || "", // Handle null image_url
                  slug: row.original.slug,
                  subcategories: (row.original.subcategories || []).map(sub => ({
                    name: sub.name,
                    description: sub.description || "",
                    slug: sub.slug,
                  })), // Map to form format
                }}
                action={(formData) => editCategory(row.original.id, formData)}
                previewImage={row.original.image_url || ""} // Handle null image_url
              >
                <SheetTooltip content="Edit Category">
                  <PenSquare className="size-5" />
                </SheetTooltip>
              </CategoryFormSheet>
            )}

            {hasPermission("categories", "canDelete") && (
              <TableActionAlertDialog
                title={`Delete ${row.original.name}?`}
                description="This action cannot be undone. This will permanently delete the category and its associated data from the database."
                tooltipContent="Delete Category"
                actionButtonText="Delete Category"
                toastSuccessMessage={`Category "${row.original.name}" deleted successfully!`}
                queryKey="categories"
                action={() => deleteCategory(row.original.id)}
              >
                <Trash2 className="size-5" />
              </TableActionAlertDialog>
            )}
          </div>
        );
      },
    });
  }

  return columns;
};

export const skeletonColumns: SkeletonColumn[] = [
  {
    header: <Checkbox disabled checked={false} />,
    cell: <Skeleton className="size-4 rounded-sm" />,
  },
  {
    header: "icon",
    cell: <Skeleton className="w-8 h-8 rounded-full" />,
  },
  {
    header: "name",
    cell: <Skeleton className="w-20 h-8" />,
  },
  {
    header: "description",
    cell: <Skeleton className="w-[32rem] h-8" />,
  },
  {
    header: "subcategories",
    cell: <Skeleton className="w-48 h-6" />,
  },
  {
    header: "published",
    cell: <Skeleton className="w-16 h-10" />,
  },
  {
    header: "actions",
    cell: <Skeleton className="w-20 h-8" />,
  },
];