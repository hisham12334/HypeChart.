'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Package, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { OrderDetailsDialog } from '@/components/orders/order-details-dialog';

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchOrders = async () => {
        try {
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

    const handleViewOrder = (order: any) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800 border-green-200';
            case 'processing': return 'bg-blue-50 text-blue-700 border-blue-200'; // Added processing color
            case 'shipped': return 'bg-blue-100 text-blue-800 border-blue-200';
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
                        <>
                            {/* --- DESKTOP TABLE VIEW --- */}
                            <div className="hidden md:block rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order ID</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{order.customerName}</div>
                                                    <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                                                        {order.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell>₹{order.totalAmount || order.total}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewOrder(order)}
                                                        className="border-neutral-300 text-neutral-900 hover:bg-neutral-100"
                                                    >
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* --- MOBILE CARD VIEW --- */}
                            <div className="md:hidden space-y-4">
                                {orders.map((order) => (
                                    <div key={order.id} className="bg-white p-4 rounded-xl border shadow-sm space-y-3" onClick={() => handleViewOrder(order)}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-mono text-xs text-gray-400">#{order.orderNumber}</span>
                                                <h3 className="font-bold text-gray-900">{order.customerName}</h3>
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center text-sm border-t pt-3 border-dashed border-gray-100">
                                            <div className="text-gray-500">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="font-bold text-lg">
                                                ₹{order.totalAmount || order.total}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <OrderDetailsDialog
                order={selectedOrder}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div >
    );
}