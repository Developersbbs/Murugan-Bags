import { Card } from "@/components/ui/card";
import { exportOrders } from "@/actions/orders/exportOrders";
import { ExportDataButtons } from "@/components/shared/ExportDataButtons";

export default function OrderActions() {
    return (
        <Card className="mb-5">
            <ExportDataButtons action={exportOrders} tableName="orders" hideJson={true} />
        </Card>
    );
}
