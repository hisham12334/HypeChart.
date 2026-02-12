"use client";
import React, { useState } from 'react';
import Script from 'next/script';
import { motion } from 'framer-motion';
import { BorderBeam } from "../../components/border-beam";
import { Footer } from "../../components/footer";
import Link from 'next/link';

export default function PricingPage() {
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            // 1. Create Order
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payments/subscription`, {
                method: 'POST',
            });
            const data = await res.json();

            if (!data.success) {
                alert("Failed to initialize subscription");
                setLoading(false);
                return;
            }

            // 2. Open Razorpay
            const options = {
                key: data.keyId,
                amount: data.amount,
                currency: data.currency,
                name: "Hypechart.co",
                description: "Pro Plan Monthly Subscription",
                order_id: data.orderId,
                handler: async function (response: any) {
                    // Verify Payment
                    const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payments/verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    });

                    const verifyData = await verifyRes.json();
                    if (verifyData.success) {
                        alert("Subscription Successful! Welcome to Pro.");
                    } else {
                        alert("Payment verification failed.");
                    }
                },
                theme: {
                    color: "#00FF9D" // Neon Green
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                alert("Payment Failed: " + response.error.description);
            });
            rzp.open();
            setLoading(false);

        } catch (error) {
            console.error(error);
            alert("Something went wrong");
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-background selection:bg-neon selection:text-black">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="text-xl font-black tracking-tighter text-white">
                        HYPECHART<span className="text-neon">.CO</span>
                    </Link>
                </div>
            </header>

            <section className="pt-32 pb-16 px-4 relative flex items-center justify-center min-h-screen">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neon/10 via-background to-background opacity-50" />

                <div className="max-w-md w-full relative z-10">
                    <div className="bg-black border border-zinc-800 p-8 rounded-none relative overflow-hidden group">
                        <BorderBeam />

                        <div className="text-center mb-8">
                            <h2 className="text-sm font-bold text-neon uppercase tracking-widest mb-2">Early Access Plan</h2>
                            <h1 className="text-4xl font-black text-white mb-4">Go Pro</h1>
                            <div className="flex items-end justify-center gap-1">
                                <span className="text-3xl text-gray-400">₹</span>
                                <span className="text-6xl font-black text-white">700</span>
                                <span className="text-gray-400 mb-2">/mo</span>
                            </div>
                        </div>

                        <ul className="space-y-4 mb-8 text-gray-300">
                            <li className="flex items-center gap-3">
                                <span className="text-neon">✓</span> Unlimited Drops
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-neon">✓</span> Priority Support
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-neon">✓</span> Analytics Dashboard
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-neon">✓</span> Remove Branding
                            </li>
                        </ul>

                        <button
                            onClick={handleSubscribe}
                            disabled={loading}
                            className="w-full bg-white hover:bg-neon text-black font-black uppercase tracking-wide py-4 text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : 'Subscribe Now'}
                        </button>

                        <p className="text-xs text-center text-zinc-600 mt-4">
                            Secure payment via Razorpay. Cancel anytime.
                        </p>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
