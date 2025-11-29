import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface WishlistItem {
  _id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  price: number;
  discounted_price?: number;
  created_at: string;
}

interface WishlistTabProps {
  items: WishlistItem[];
  totalItems: number;
}

export default function WishlistTab({ items, totalItems }: WishlistTabProps) {
  if (totalItems === 0) {
    return (
      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Wishlist</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No items in wishlist</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card text-card-foreground">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-semibold">Wishlist</CardTitle>
          <Badge variant="outline" className="px-3 py-1">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item._id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
              {item.product_image && (
                <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                  <img 
                    src={item.product_image} 
                    alt={item.product_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{item.product_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium text-primary">
                    {formatCurrency(item.discounted_price || item.price)}
                  </span>
                  {item.discounted_price && item.discounted_price < item.price && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatCurrency(item.price)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Added {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recently'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
