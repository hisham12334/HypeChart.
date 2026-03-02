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

const STATUS_FILTERS = ['All', 'paid', 'confirmed', 'shipped', 'delivered'];

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');

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

    // Update the order in the local list when status changes in the dialog
    const handleOrderUpdated = (updatedOrder: any) => {
        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, status: updatedOrder.status } : o));
        setSelectedOrder(updatedOrder);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800 border-green-200';
            case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const filteredOrders = activeFilter === 'All'
        ? orders
        : orders.filter(o => o.status === activeFilter);

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
                <button
                    onClick={fetchOrders}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    Refresh ↻
                </button>
            </div>

            {/* STATUS FILTER TABS */}
            <div className="flex gap-2 flex-wrap">
                {STATUS_FILTERS.map(filter => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${activeFilter === filter
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                            }`}
                    >
                        {filter === 'All' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                        {filter !== 'All' && (
                            <span className="ml-1.5 text-xs opacity-70">
                                ({orders.filter(o => o.status === filter).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {activeFilter === 'All' ? 'All Orders' : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Orders`}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">({filteredOrders.length})</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>{activeFilter === 'All' ? 'No orders yet.' : `No ${activeFilter} orders.`}</p>
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
                                        {filteredOrders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{order.customer?.name || order.customerName}</div>
                                                    <div className="text-xs text-muted-foreground">{order.customer?.phone || order.customerPhone}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(order.status)}`}>
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
                                {filteredOrders.map((order) => (
                                    <div key={order.id} className="bg-white p-4 rounded-xl border shadow-sm space-y-3" onClick={() => handleViewOrder(order)}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-mono text-xs text-gray-400">#{order.orderNumber}</span>
                                                <h3 className="font-bold text-gray-900">{order.customer?.name || order.customerName}</h3>
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border ${getStatusStyle(order.status)}`}>
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
                onOrderUpdated={handleOrderUpdated}
            />
        </div>
    );
}