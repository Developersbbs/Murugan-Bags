import { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaBagShopping } from "react-icons/fa6";
import { format } from "date-fns";

import PageTitle from "@/components/shared/PageTitle";
import Typography from "@/components/ui/typography";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { getDiscount } from "@/helpers/getDiscount";
import { OrderBadgeVariants } from "@/constants/badge";
import { fetchOrderDetails } from "@/services/orders";
import { InvoiceActions } from "./_components/InvoiceActions";

type PageParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { id } = await params;
  try {
    const { order } = await fetchOrderDetails({ id });
    return { title: `Order #${order.invoice_no}` };
  } catch (e) {
    return { title: "Order not found" };
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Format as Indian Rupees */
const inr = (amount: number) =>
  `₹${(isNaN(amount) ? 0 : amount).toFixed(2)}`;

// FIX: Resolve the correct display name for an order item.
// Backend GET /:id already resolves the full variant name into products.name
// (e.g. "Galaxy - Large / Teal") via resolveVariantName on the backend.
// We must return products.name directly — do NOT re-append attributes.
//
// Priority:
//   1. item.variant_name          — explicit field, most reliable
//   2. item.products?.name        — backend-resolved full variant name (Shape A & B)
//   3. item.name + attributes     — Shape B embedded items fallback
//   4. item.variant_sku           — last resort SKU append
const resolveItemName = (item: any): string => {
  // 1. Explicit variant_name field (most reliable when present)
  if (item.variant_name) return item.variant_name;

  // 2. products.name from backend GET /:id — already contains "Product - Variant"
  //    Do NOT treat this as a base name and re-append attributes;
  //    the backend resolver already built the full display name.
  if (item.products?.name) return item.products.name;

  // 3. Fallback for Shape B (embedded order.items): build from item.name + variant_attributes
  const baseName: string = item.name || "Product";

  if (item.variant_attributes && typeof item.variant_attributes === "object") {
    const attrs =
      item.variant_attributes instanceof Map
        ? Object.fromEntries(item.variant_attributes)
        : item.variant_attributes;
    const attrStr = Object.values(attrs).filter(Boolean).join(" / ");
    if (attrStr) return `${baseName} - ${attrStr}`;
  }

  // 4. Append SKU when it adds useful variant info
  if (item.variant_sku && item.variant_sku !== "N/A") {
    return `${baseName} (${item.variant_sku})`;
  }

  return baseName;
};

export default async function Order({ params }: PageParams) {
  const { id } = await params;
  try {
    const { order } = await fetchOrderDetails({ id });

    // ── Normalise items ────────────────────────────────────────────────────
    // Backend GET /:id returns items in two possible shapes:
    //   Shape A (legacy OrderItem): order_items[].products.name + unit_price
    //   Shape B (embedded schema) : order.items[].name          + price
    const rawItems: any[] =
      (order as any).order_items ||
      (order as any).items ||
      [];

    const normalisedItems = rawItems.map((item: any) => ({
      name:       resolveItemName(item),
      unit_price: typeof item.unit_price === "number" ? item.unit_price
                  : typeof item.price    === "number" ? item.price
                  : 0,
      quantity:   item.quantity ?? 1,
    }));

    // ✅ FIX: Always use order.total_amount from the DB as the authoritative total.
    // The DB total_amount = subtotal + shipping + tax (10%), computed at order
    // placement time. Re-computing on the frontend (subtotal + shipping only)
    // drops the tax component and shows a wrong figure (e.g. ₹6,999 vs ₹7,698.90).
    const totalAmount = order.total_amount;

    return (
      <section>
        <PageTitle className="print:hidden">Invoice</PageTitle>

        <Card className="mb-8 text-muted-foreground p-4 lg:p-6 print:border-none print:bg-white print:mb-0">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-x-4 gap-y-6 print:flex-row print:justify-between">
            <div className="flex flex-col">
              <Typography
                className="uppercase text-card-foreground mb-1.5 md:text-xl tracking-wide print:text-black"
                variant="h2"
              >
                invoice
              </Typography>

              <div className="flex items-center gap-x-2">
                <Typography className="uppercase font-semibold text-xs print:text-black">
                  status
                </Typography>

                <Badge
                  variant={OrderBadgeVariants[order.status]}
                  className="flex-shrink-0 text-xs capitalize"
                >
                  {order.status}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col text-sm gap-y-0.5 md:text-right print:text-right print:text-black">
              <div className="flex items-center md:justify-end gap-x-1 print:justify-end">
                <FaBagShopping className="size-6 text-primary mb-1 flex-shrink-0" />
                <Typography
                  component="span"
                  variant="h2"
                  className="text-card-foreground print:text-black"
                >
                  ECommerce
                </Typography>
              </div>

              <Typography component="p">
                2 Lawson Avenue, California, United States
              </Typography>
              <Typography component="p">+1 (212) 456-7890</Typography>
              <Typography component="p" className="break-words">
                ecommerceadmin@gmail.com
              </Typography>
              <Typography component="p">
                ecommerce-admin-board.vercel.app
              </Typography>
            </div>
          </div>

          <Separator className="my-6 print:bg-print-border" />

          {/* ── Date / Invoice No / Invoice To ─────────────────────────── */}
          <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-10 print:flex-row print:justify-between print:text-black">
            <div>
              <Typography
                variant="p"
                component="h4"
                className="font-semibold uppercase text-card-foreground mb-1 print:text-black"
              >
                date
              </Typography>

              <Typography className="text-sm">
                {format(new Date(order.order_time), "PPP")}
              </Typography>
            </div>

            <div>
              <Typography
                variant="p"
                component="h4"
                className="font-semibold uppercase text-card-foreground mb-1 print:text-black"
              >
                invoice no
              </Typography>

              <Typography className="text-sm">#{order.invoice_no}</Typography>
            </div>

            <div className="md:text-right print:text-right">
              <Typography
                variant="p"
                component="h4"
                className="font-semibold uppercase text-card-foreground mb-1 print:text-black"
              >
                invoice to
              </Typography>

              <div className="flex flex-col text-sm gap-y-0.5">
                <Typography component="p">{order.customers.name}</Typography>
                <Typography component="p" className="break-words">
                  {order.customers.email}
                </Typography>
                {order.customers.phone && (
                  <Typography component="p">{order.customers.phone}</Typography>
                )}
                {order.customers.address && (
                  <Typography component="p" className="max-w-80">
                    {order.customers.address}
                  </Typography>
                )}
              </div>
            </div>
          </div>

          {/* ── Items table ────────────────────────────────────────────── */}
          <div className="border rounded-md overflow-hidden mb-10 print:text-black print:border-print-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 dark:bg-transparent print:border-b-print-border">
                  <TableHead className="uppercase h-10 whitespace-nowrap print:text-black">
                    SR.
                  </TableHead>
                  <TableHead className="uppercase h-10 whitespace-nowrap print:text-black">
                    product title
                  </TableHead>
                  <TableHead className="uppercase h-10 whitespace-nowrap text-center print:text-black">
                    quantity
                  </TableHead>
                  <TableHead className="uppercase h-10 whitespace-nowrap text-center print:text-black">
                    item price
                  </TableHead>
                  <TableHead className="uppercase h-10 whitespace-nowrap text-right print:text-black">
                    amount
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {normalisedItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-6 text-gray-400 text-sm"
                    >
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  normalisedItems.map((item, index) => (
                    <TableRow
                      key={`order-item-${index}`}
                      className="hover:bg-transparent print:border-b-print-border"
                    >
                      <TableCell className="py-3 print:font-normal print:text-black">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium py-3 px-6 text-card-foreground print:font-normal print:text-black">
                        {item.name}
                      </TableCell>
                      <TableCell className="font-semibold py-3 text-center print:font-normal print:text-black">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="font-semibold py-3 text-center print:font-normal print:text-black">
                        {inr(item.unit_price)}
                      </TableCell>
                      <TableCell className="font-semibold py-3 text-primary text-right print:text-black">
                        {inr(item.quantity * item.unit_price)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Totals ─────────────────────────────────────────────────── */}
          <div className="bg-background rounded-lg flex flex-col gap-4 md:justify-between md:flex-row p-6 md:px-8 mb-4 print:flex-row print:justify-between print:mb-0 print:p-0 print:px-2 print:bg-white">
            <div>
              <Typography
                component="h4"
                className="font-medium text-sm uppercase mb-1 tracking-wide print:text-black"
              >
                payment method
              </Typography>

              <Typography className="text-base capitalize font-semibold text-card-foreground tracking-wide print:text-black">
                {order.payment_method}
              </Typography>
            </div>

            <div>
              <Typography
                component="h4"
                className="font-medium text-sm uppercase mb-1 tracking-wide print:text-black"
              >
                shipping cost
              </Typography>

              <Typography className="text-base capitalize font-semibold text-card-foreground tracking-wide print:text-black">
                {inr(order.shipping_cost)}
              </Typography>
            </div>

            <div>
              <Typography
                component="h4"
                className="font-medium text-sm uppercase mb-1 tracking-wide print:text-black"
              >
                discount
              </Typography>

              <Typography className="text-base capitalize font-semibold text-card-foreground tracking-wide print:text-black">
                ₹
                {getDiscount({
                  totalAmount: order.total_amount,
                  shippingCost: order.shipping_cost,
                  coupon: order.coupons,
                })}
              </Typography>
            </div>

            <div>
              <Typography
                component="h4"
                className="font-medium text-sm uppercase mb-1 tracking-wide print:text-black"
              >
                total amount
              </Typography>

              {/* ✅ FIX: Use order.total_amount directly (includes tax + shipping).
                  Previous code recalculated as subtotal+shipping which dropped tax. */}
              <Typography className="text-xl capitalize font-semibold tracking-wide text-primary">
                {inr(totalAmount)}
              </Typography>
            </div>
          </div>
        </Card>

        <InvoiceActions order={order} />
      </section>
    );
  } catch (e) {
    return notFound();
  }
}