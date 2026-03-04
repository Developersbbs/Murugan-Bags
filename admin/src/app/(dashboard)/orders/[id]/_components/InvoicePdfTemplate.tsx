import { FaBagShopping } from "react-icons/fa6";
import { format } from "date-fns";

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

import { OrderDetails } from "@/services/orders/types";
import { OrderBadgeVariants } from "@/constants/badge";
import { formatCurrency } from "@/lib/utils";


const resolveItemName = (item: any): string => {
  //  Use stored order snapshot (MOST RELIABLE)
  if (item.name) return item.name;

  //  Backend resolved name
  if (item.products?.name) return item.products.name;

  // Explicit variant_name
  if (item.variant_name) return item.variant_name;

  // Fallback build using attributes
  const baseName = "Product";

  if (item.variant_attributes && typeof item.variant_attributes === "object") {
    const attrs =
      item.variant_attributes instanceof Map
        ? Object.fromEntries(item.variant_attributes)
        : item.variant_attributes;

    const attrStr = Object.values(attrs).filter(Boolean).join(" / ");

    if (attrStr) return `${baseName} - ${attrStr}`;
  }

  //  SKU fallback
  if (item.variant_sku && item.variant_sku !== "N/A") {
    return `${baseName} (${item.variant_sku})`;
  }

  return baseName;
};

export default function InvoicePdfTemplate({ order }: { order: OrderDetails }) {

  const rawItems: any[] =
    (order as any).order_items ||
    (order as any).items ||
    [];

  const normalisedItems = rawItems.map((item: any) => ({
    name: resolveItemName(item),
    unit_price: typeof item.unit_price === "number" ? item.unit_price
      : typeof item.price === "number" ? item.price
        : 0,
    quantity: item.quantity ?? 1,
  }));

  //  FIX: Use order.total_amount from DB as the authoritative total.
 
  const totalAmount = order.total_amount;

  return (
    <Card
      id={`invoice-${order.invoice_no}`}
      className="text-black p-20 border-none bg-white rounded-none"
      style={{ width: "794px", height: "1123px" }}
    >
      <div className="flex justify-between gap-x-4 gap-y-6">
        <div className="flex flex-col">
          <Typography
            className="uppercase text-black mb-1.5 tracking-wide"
            variant="h2"
          >
            invoice
          </Typography>

          <div className="group light-only flex items-center gap-x-2">
            <Typography className="uppercase font-semibold text-xs">
              status
            </Typography>

            <Badge
              variant={OrderBadgeVariants[order.status]}
              className="flex-shrink-0 text-xs capitalize translate-y-1.5 relative"
            >
              <span className="text-transparent">{order.status}</span>
              <span className="absolute left-2.5 capitalize bottom-2">
                {order.status}
              </span>
            </Badge>
          </div>
        </div>

        <div className="flex flex-col text-sm gap-y-0.5 text-right text-black">
          <div className="flex items-end justify-end gap-x-1">
            <FaBagShopping className="size-6 text-primary flex-shrink-0" />
            <Typography component="span" variant="h2" className="mb-1.5">
              ECommerce
            </Typography>
          </div>
          <Typography component="p">2 Lawson Avenue, California, United States</Typography>
          <Typography component="p">+1 (212) 456-7890</Typography>
          <Typography component="p" className="break-words">ecommerceadmin@gmail.com</Typography>
          <Typography component="p">ecommerce-admin-board.vercel.app</Typography>
        </div>
      </div>

      <Separator className="my-6 bg-print-border" />

      <div className="flex justify-between gap-4 mb-10 text-black">
        <div>
          <Typography variant="p" component="h4" className="font-semibold uppercase mb-1 text-black">
            date
          </Typography>
          <Typography className="text-sm">
            {format(new Date(order.order_time), "PPP")}
          </Typography>
        </div>

        <div>
          <Typography variant="p" component="h4" className="font-semibold uppercase mb-1 text-black">
            invoice no
          </Typography>
          <Typography className="text-sm">#{order.invoice_no}</Typography>
        </div>

        <div className="text-right">
          <Typography variant="p" component="h4" className="font-semibold uppercase mb-1 text-black">
            invoice to
          </Typography>
          <div className="flex flex-col text-sm gap-y-0.5">
            <Typography component="p">{order.customers.name}</Typography>
            <Typography component="p" className="break-words">{order.customers.email}</Typography>
            {order.customers.phone && (
              <Typography component="p">{order.customers.phone}</Typography>
            )}
            {order.customers.address && (
              <Typography component="p" className="max-w-80">{order.customers.address}</Typography>
            )}
          </div>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden mb-10 text-black border-print-border">
        <Table>
          <TableHeader>
            <TableRow className="border-b-print-border hover:bg-transparent">
              <TableHead className="uppercase h-10 whitespace-nowrap text-black">SR.</TableHead>
              <TableHead className="uppercase h-10 whitespace-nowrap text-black">product title</TableHead>
              <TableHead className="uppercase h-10 whitespace-nowrap text-center text-black">quantity</TableHead>
              <TableHead className="uppercase h-10 whitespace-nowrap text-center text-black">item price</TableHead>
              <TableHead className="uppercase h-10 whitespace-nowrap text-right text-black">amount</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {normalisedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-gray-400 text-sm">
                  No items found
                </TableCell>
              </TableRow>
            ) : (
              normalisedItems.map((item, index) => (
                <TableRow key={`order-item-${index}`} className="hover:bg-transparent border-b-print-border">
                  <TableCell className="py-3 font-normal text-black">{index + 1}</TableCell>
                  <TableCell className="py-3 px-6 font-medium text-black line-clamp-2">{item.name}</TableCell>
                  <TableCell className="py-3 text-center font-normal text-black">{item.quantity}</TableCell>
                  <TableCell className="py-3 text-center font-normal text-black">
                    {formatCurrency(item.unit_price, 'INR', 'en-IN')}
                  </TableCell>
                  <TableCell className="font-semibold py-3 text-primary text-right text-black">
                    {formatCurrency(item.quantity * item.unit_price, 'INR', 'en-IN')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg flex gap-4 justify-between md:flex-row px-2">
        <div>
          <Typography component="h4" className="font-medium text-sm uppercase mb-1 tracking-wide text-black">
            payment method
          </Typography>
          <Typography className="text-base capitalize font-semibold tracking-wide text-black">
            {order.payment_method}
          </Typography>
        </div>

        <div>
          <Typography component="h4" className="font-medium text-sm uppercase mb-1 tracking-wide text-black">
            shipping cost
          </Typography>
          <Typography className="text-base capitalize font-semibold tracking-wide text-black">
            {formatCurrency(order.shipping_cost, 'INR', 'en-IN')}
          </Typography>
        </div>

        <div>
          <Typography component="h4" className="font-medium text-sm uppercase mb-1 tracking-wide text-black">
            discount
          </Typography>
          <Typography className="text-base capitalize font-semibold tracking-wide text-black">
            {formatCurrency(
              order.coupons
                ? order.coupons.discount_type === "fixed"
                  ? order.coupons.discount_value
                  : ((order.total_amount - order.shipping_cost) * 100) /
                    (100 - order.coupons.discount_value) -
                    (order.total_amount - order.shipping_cost)
                : 0,
              'INR',
              'en-IN'
            )}
          </Typography>
        </div>

        <div>
          <Typography component="h4" className="font-medium text-sm uppercase mb-1 tracking-wide text-black">
            total amount
          </Typography>
          {/* ✅ FIX: Use order.total_amount directly (includes tax + shipping).
              Previous code recalculated as subtotal+shipping which dropped tax. */}
          <Typography className="text-xl capitalize font-semibold tracking-wide text-primary">
            {formatCurrency(totalAmount, 'INR', 'en-IN')}
          </Typography>
        </div>
      </div>
    </Card>
  );
}