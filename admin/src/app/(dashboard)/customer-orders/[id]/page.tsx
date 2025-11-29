import { Metadata } from "next";
import { notFound } from "next/navigation";
import { IoBagHandle, IoHeartOutline, IoCartOutline } from "react-icons/io5";

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Typography from "@/components/ui/typography";
import PageTitle from "@/components/shared/PageTitle";

import CustomerOrdersTable from "./_components/Table";
import CustomerProfileCard from "./_components/CustomerProfileCard";
import WishlistTab from "./_components/WishlistTab";
import CartTab from "./_components/CartTab";
import { 
  fetchCustomerOrders, 
  fetchCustomerDetails, 
  fetchCustomerWishlist,
  fetchCustomerCart 
} from "@/services/customers";

type PageParams = {
  params: {
    id: string;
  };
};

export async function generateMetadata({
  params: { id },
}: PageParams): Promise<Metadata> {
  try {
    const { customer } = await fetchCustomerDetails(id);
    return { title: customer?.name || 'Customer Profile' };
  } catch (e) {
    return { title: "Customer not found" };
  }
}

export default async function CustomerOrders({ params: { id } }: PageParams) {
  try {
    const [
      { customer }, 
      { customerOrders },
      wishlistData,
      cartData
    ] = await Promise.all([
      fetchCustomerDetails(id),
      fetchCustomerOrders({ id }),
      fetchCustomerWishlist(id).catch(() => ({ items: [], totalItems: 0 })),
      fetchCustomerCart(id).catch(() => ({ items: [], totalItems: 0, cartTotal: 0 }))
    ]);

    return (
      <div className="space-y-6">
        <PageTitle>Customer Profile</PageTitle>
        
        {/* Customer Profile Card */}
        <CustomerProfileCard customer={customer} />

        {/* Tabs for Orders, Wishlist, and Cart */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mb-6">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <IoBagHandle className="h-4 w-4" />
              <span>Orders</span>
              {customerOrders.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {customerOrders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="flex items-center gap-2">
              <IoHeartOutline className="h-4 w-4" />
              <span>Wishlist</span>
              {wishlistData.totalItems > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {wishlistData.totalItems}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="cart" className="flex items-center gap-2">
              <IoCartOutline className="h-4 w-4" />
              <span>Cart</span>
              {cartData.totalItems > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {cartData.totalItems}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Order History</h2>
              <div className="text-sm text-muted-foreground">
                {customerOrders.length} {customerOrders.length === 1 ? 'order' : 'orders'} total
              </div>
            </div>

            {customerOrders.length === 0 ? (
              <Card className="w-full flex flex-col items-center justify-center py-12 text-center">
                <IoBagHandle className="text-muted-foreground size-12 mb-4" />
                <Typography variant="h4" className="mb-2">No Orders Yet</Typography>
                <Typography variant="muted">This customer hasn't placed any orders yet.</Typography>
              </Card>
            ) : (
              <CustomerOrdersTable data={customerOrders} />
            )}
          </TabsContent>

          <TabsContent value="wishlist" className="space-y-4">
            <WishlistTab 
              items={wishlistData.items} 
              totalItems={wishlistData.totalItems} 
            />
          </TabsContent>

          <TabsContent value="cart" className="space-y-4">
            <CartTab 
              items={cartData.items}
              totalItems={cartData.totalItems}
              cartTotal={cartData.cartTotal}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  } catch (e) {
    console.error('Error loading customer data:', e);
    return notFound();
  }
}
