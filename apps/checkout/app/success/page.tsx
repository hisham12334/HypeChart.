'use client';

import Link from 'next/link';
import { CheckCircle, ArrowRight, ShoppingBag } from 'lucide-react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');

    return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white border border-neutral-200 p-10 text-center shadow-sm">
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                </div>

                <h1 className="text-3xl font-serif text-neutral-900 mb-2">Order Confirmed</h1>
                <p className="text-neutral-500 mb-8">
                    Thank you for your purchase. Your order has been secured.
                </p>

                {orderId && (
                    <div className="bg-neutral-50 p-4 mb-8 border border-neutral-100">
                        <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium">Order ID</p>
                        <p className="text-sm font-mono text-neutral-900 mt-1">{orderId}</p>
                    </div>
                )}

                <div className="space-y-3">
                    <Link
                        href="/"
                        className="block w-full bg-neutral-900 text-white py-4 text-sm font-medium tracking-wide hover:bg-neutral-800 transition-colors"
                    >
                        CONTINUE SHOPPING,Bye!
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SuccessContent />
        </Suspense>
    );
}