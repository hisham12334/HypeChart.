'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // We might need to install this or use standard HTML
import { Loader2, Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            // We need to create this endpoint in the API next!
            const response = await apiClient.get('/orders');
            setOrders(response.data.data);
        } catch (error) {
            console.error("Failed to fetch orders", error);
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800 border-green-200';
            case 'shipped': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'delivered': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>No orders yet.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono text-xs">{order.orderNumber || order.id.slice(0, 8)}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{order.customerName}</div>
                                            <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {/* Simplified item display */}
                                            <span className="text-sm">{order.items?.length || 1} items</span>
                                        </TableCell>
                                        <TableCell>₹{order.totalAmount || order.total}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}