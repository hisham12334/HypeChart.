'use client';

import { useState } from 'react';
import { X, Printer, MessageCircle, FileSpreadsheet, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ordersApi } from '@/lib/api-client';

interface OrderDetailsDialogProps {
    order: any;
    isOpen: boolean;
    onClose: () => void;
    onOrderUpdated?: (updatedOrder: any) => void;
}

// Status pipeline definition
const STATUS_FLOW = [
    { key: 'paid', label: 'Paid', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50 border-green-200' },
    { key: 'confirmed', label: 'Confirmed', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50 border-blue-200' },
    { key: 'shipped', label: 'Shipped', color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50 border-purple-200' },
    { key: 'delivered', label: 'Delivered', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50 border-emerald-200' },
];

function getStatusIndex(status: string) {
    return STATUS_FLOW.findIndex(s => s.key === status);
}

export function OrderDetailsDialog({ order: initialOrder, isOpen, onClose, onOrderUpdated }: OrderDetailsDialogProps) {
    const [order, setOrder] = useState<any>(initialOrder);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Update local state when initialOrder changes (e.g. re-opening a different order)
    if (initialOrder && order?.id !== initialOrder?.id) {
        setOrder(initialOrder);
    }

    if (!isOpen || !order) return null;

    // --- SAFE DATA EXTRACTION ---
    const customerName = order.customer?.name || order.customerName || 'Guest';
    const customerPhone = order.customer?.phone || order.customerPhone || 'N/A';
    const customerEmail = order.customer?.email || order.email || '';

    const addressLine = order.address?.addressLine1 || order.address || '';
    const city = order.address?.city || order.city || '';
    const state = order.address?.state || order.state || '';
    const pincode = order.address?.pincode || order.pincode || '';

    const currentStatusIndex = getStatusIndex(order.status);
    const nextStatus = STATUS_FLOW[currentStatusIndex + 1];

    // --- ACTIONS ---
    const handlePrint = () => {
        window.print();
    };

    const handleWhatsAppShare = () => {
        const message = `
*Invoice for Order #${order.orderNumber}*
Customer: ${customerName}
Phone: ${customerPhone}
Amount: ₹${order.total}
Status: ${order.status}

*Items:*
${(order.items || []).map((i: any) => `- ${i.productName} (${i.variantName}) x${i.quantity}`).join('\n')}

Thank you for shopping with Hypechart!
    `.trim();

        const url = `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleExportCSV = () => {
        const headers = "Order ID,Date,Customer,Phone,City,Items,Total,Status\n";
        const itemSummary = (order.items || []).map((i: any) => `${i.productName} x${i.quantity}`).join(' | ');
        const row = `${order.orderNumber},${new Date(order.createdAt).toLocaleDateString()},${customerName},${customerPhone},${city},"${itemSummary}",${order.total},${order.status}`;

        const csvContent = "data:text/csv;charset=utf-8," + headers + row;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `invoice_${order.orderNumber}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Invoice exported to CSV");
    };

    const handleAdvanceStatus = async () => {
        if (!nextStatus) return;

        try {
            setIsUpdatingStatus(true);
            const res = await ordersApi.updateStatus(order.id, nextStatus.key);
            if (res.success) {
                const updated = { ...order, status: nextStatus.key };
                setOrder(updated);
                onOrderUpdated?.(updated);
                toast.success(
                    `Order moved to "${nextStatus.label}"! ${res.data?.user?.whatsappEnabled ? '📱 WhatsApp sent to customer.' : ''}`,
                    { duration: 4000 }
                );
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to update order status');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white">
            <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] print:shadow-none print:w-full print:max-w-none print:max-h-none print:rounded-none">

                {/* --- HEADER --- */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-xl print:hidden shrink-0">
                    <h2 className="text-lg font-bold text-gray-800">Order Details</h2>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleExportCSV} className="bg-blue-600 hover:bg-blue-700 text-white border-none">
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            CSV
                        </Button>
                        <Button size="sm" onClick={handleWhatsAppShare} className="bg-green-600 hover:bg-green-700 text-white border-none">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            WhatsApp
                        </Button>
                        <Button size="sm" onClick={handlePrint} className="bg-neutral-900 hover:bg-black text-white border-none">
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-500 hover:bg-gray-200">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* --- STATUS PIPELINE --- */}
                <div className="px-6 py-4 border-b bg-white print:hidden shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Order Status</span>
                        {nextStatus && (
                            <Button
                                size="sm"
                                onClick={handleAdvanceStatus}
                                disabled={isUpdatingStatus}
                                className="text-xs h-8 px-3 bg-gray-900 hover:bg-black text-white"
                            >
                                {isUpdatingStatus ? (
                                    <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Updating...</>
                                ) : (
                                    <>Move to {nextStatus.label} <ChevronRight className="w-3.5 h-3.5 ml-1" /></>
                                )}
                            </Button>
                        )}
                        {!nextStatus && currentStatusIndex >= 0 && (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                                ✓ Order Complete
                            </span>
                        )}
                    </div>

                    {/* Pipeline Track */}
                    <div className="flex items-center gap-0">
                        {STATUS_FLOW.map((s, index) => {
                            const isDone = index <= currentStatusIndex;
                            const isCurrent = index === currentStatusIndex;
                            return (
                                <div key={s.key} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center flex-1">
                                        {/* Circle */}
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 transition-all ${isDone
                                                ? `${s.color} border-transparent`
                                                : 'bg-white border-gray-200 text-gray-300'
                                            } ${isCurrent ? 'ring-4 ring-offset-1 ring-opacity-30 ' + s.color.replace('bg-', 'ring-') : ''}`}>
                                            {isDone ? '✓' : <span className="text-gray-400 font-normal">{index + 1}</span>}
                                        </div>
                                        {/* Label */}
                                        <span className={`text-[10px] mt-1 font-semibold ${isCurrent ? s.textColor : isDone ? 'text-gray-500' : 'text-gray-300'
                                            }`}>
                                            {s.label}
                                        </span>
                                    </div>
                                    {/* Connector line */}
                                    {index < STATUS_FLOW.length - 1 && (
                                        <div className={`h-0.5 flex-1 mb-4 transition-all ${index < currentStatusIndex ? 'bg-gray-400' : 'bg-gray-150 bg-gray-200'
                                            }`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- INVOICE CONTENT --- */}
                <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible" id="invoice-content">

                    <div className="flex justify-between items-start mb-8 pb-8 border-b">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter">
                                {order.user?.brandName || "Hypechart"}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">Premium Streetwear Drops</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Order ID</p>
                            <p className="text-xl font-mono font-bold text-gray-900">{order.orderNumber}</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                            {/* Status badge in invoice */}
                            <span className={`inline-flex items-center px-2.5 py-0.5 mt-2 rounded-full text-xs font-semibold border ${STATUS_FLOW.find(s => s.key === order.status)?.bgLight || 'bg-gray-100 border-gray-200'}`}>
                                {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">Billed To</h3>
                            <p className="font-bold text-gray-900">{customerName}</p>
                            <p className="text-sm text-gray-600">Phone: {customerPhone}</p>
                            {customerEmail && <p className="text-sm text-gray-600">{customerEmail}</p>}
                        </div>
                        <div className="text-right">
                            <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">Shipped To</h3>
                            <div className="text-sm text-gray-600">
                                <p>{addressLine}</p>
                                <p>{city}, {state}</p>
                                <p className="font-medium text-gray-900">PIN: {pincode}</p>
                                <p className="mt-1">Phone: {customerPhone}</p>
                            </div>
                        </div>
                    </div>

                    <table className="w-full mb-8">
                        <thead>
                            <tr className="border-b-2 border-gray-100">
                                <th className="text-left py-3 text-xs font-bold uppercase text-gray-400">Item</th>
                                <th className="text-right py-3 text-xs font-bold uppercase text-gray-400">Qty</th>
                                <th className="text-right py-3 text-xs font-bold uppercase text-gray-400">Price</th>
                                <th className="text-right py-3 text-xs font-bold uppercase text-gray-400">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {(order.items || []).map((item: any) => (
                                <tr key={item.id} className="border-b border-gray-50">
                                    <td className="py-4">
                                        <p className="font-bold text-gray-900">{item.productName}</p>
                                        <p className="text-xs text-gray-500">{item.variantName}</p>
                                    </td>
                                    <td className="py-4 text-right">{item.quantity}</td>
                                    <td className="py-4 text-right">₹{item.price}</td>
                                    <td className="py-4 text-right font-medium">₹{Number(item.price) * item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-end">
                        <div className="w-64 space-y-3">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span>₹{order.subtotal}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Shipping</span>
                                <span>₹{order.shippingFee || (Number(order.total) - Number(order.subtotal))}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold border-t pt-3">
                                <span>Total</span>
                                <span>₹{order.total}</span>
                            </div>
                        </div>
                    </div>

                    <div className="hidden print:block mt-12 pt-8 border-t text-center text-xs text-gray-400">
                        <p>Thank you for your business. This is a computer-generated invoice.</p>
                    </div>

                </div>
            </div>
        </div>
    );
}