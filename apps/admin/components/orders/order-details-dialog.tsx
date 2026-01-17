'use client';

import { X, Printer, MessageCircle, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface OrderDetailsDialogProps {
    order: any;
    isOpen: boolean;
    onClose: () => void;
}

export function OrderDetailsDialog({ order, isOpen, onClose }: OrderDetailsDialogProps) {
    if (!isOpen || !order) return null;

    // --- SAFE DATA EXTRACTION ---
    // We check both direct fields and nested 'customer' fields to ensure we always get the data
    const customerName = order.customer?.name || order.customerName || 'Guest';
    const customerPhone = order.customer?.phone || order.customerPhone || 'N/A';
    const customerEmail = order.customer?.email || order.email || '';

    // Address might be nested in 'address' object or direct fields
    const addressLine = order.address?.addressLine1 || order.address || '';
    const city = order.address?.city || order.city || '';
    const state = order.address?.state || order.state || '';
    const pincode = order.address?.pincode || order.pincode || '';

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

                {/* --- INVOICE CONTENT --- */}
                <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible" id="invoice-content">

                    <div className="flex justify-between items-start mb-8 pb-8 border-b">
                        <div>
                            {/* FIX: Use Dynamic Brand Name if available, else Fallback */}
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
                                <span>₹{order.subtotal || order.total}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Shipping</span>
                                <span>₹{order.shippingFee || 0}</span>
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