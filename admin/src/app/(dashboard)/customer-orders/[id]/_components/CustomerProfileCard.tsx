import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Order {
  _id: string;
  invoice_no: string;
  status: string;
  total_amount: number;
  order_time: string;
  payment_method: string;
  shipping_address: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

interface CustomerProfileCardProps {
  customer: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    created_at: string;
    updated_at: string;
    orders: Order[];
    statistics: {
      total_orders: number;
      total_spent: number;
      order_statuses: Record<string, { count: number; total: number }>;
    };
  };
}

export default function CustomerProfileCard({ customer }: CustomerProfileCardProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy, h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Calculate total spent from displayed orders
  const totalSpentFromOrders = customer.orders.reduce((total, order) => {
    return total + (order.total_amount || 0);
  }, 0);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string, text: string }> = {
      pending: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-800 dark:text-yellow-200" },
      processing: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-200" },
      shipped: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-800 dark:text-indigo-200" },
      delivered: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-800 dark:text-green-200" },
      cancelled: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-800 dark:text-red-200" },
    };
    const defaultStyle = { bg: "bg-gray-100 dark:bg-gray-800/50", text: "text-gray-800 dark:text-gray-200" };
    const style = statusMap[status] || defaultStyle;
    return cn(style.bg, style.text, 'px-3 py-1 rounded-full text-xs font-medium');
  };

  return (
    <div className="space-y-6">
      {/* Customer Info Card */}
      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
            <p className="mt-1 text-sm">{customer.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
            <p className="mt-1 text-sm">{customer.email}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
            <p className="mt-1 text-sm">
              {customer.phone || 'N/A'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Member Since</h3>
            <p className="mt-1 text-sm">
              {formatDate(customer.created_at)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Total Orders</h3>
            <p className="mt-1 text-sm font-medium">
              {customer.statistics.total_orders}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Total Spent</h3>
            <p className="mt-1 text-sm font-medium text-primary">
              ${totalSpentFromOrders.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Orders Card */}
      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customer.orders.slice(0, 3).map((order) => (
              <div key={order._id} className="border rounded-lg p-4 bg-background">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">Order #{order.invoice_no}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.order_time)}
                    </p>
                  </div>
                  <Badge variant="outline" className={getStatusBadge(order.status)}>
                    {order.status}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Shipping Address</h4>
                    <p className="text-sm mt-1">
                      {order.shipping_address.name}<br />
                      {order.shipping_address.street}<br />
                      {order.shipping_address.city}, {order.shipping_address.state}<br />
                      {order.shipping_address.zipCode}, {order.shipping_address.country}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Payment</h4>
                    <p className="text-sm capitalize mt-1">
                      {order.payment_method}
                    </p>
                    <p className="text-sm font-medium mt-2 text-primary">
                      Total: ${order.total_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}