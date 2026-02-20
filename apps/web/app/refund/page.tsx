import Link from "next/link";
import { Footer } from "../../components/footer";

export default function RefundPage() {
    return (
        <main className="min-h-screen bg-background selection:bg-neon selection:text-black flex flex-col">
            <nav className="p-4 md:p-6 border-b border-white/10">
                <Link href="/" className="text-sm font-bold text-white hover:text-neon uppercase tracking-widest transition-colors">← Back to Hypechart</Link>
            </nav>
            <div className="flex-1 max-w-4xl mx-auto px-6 py-16 md:py-24 w-full">
                <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-8 md:mb-12">Refund & Cancellation Policy</h1>
                <div className="space-y-8 text-gray-400 leading-relaxed text-lg">

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">1. Subscription Cancellations</h2>
                        <p>You may cancel your subscription at any time. Cancellation will take effect at the end of the current billing cycle. You will continue to have access to the Service until the end of your billing period.</p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">2. Refund Policy</h2>
                        <p><strong>General:</strong> Hypechart Technologies generally does not offer refunds for subscription fees paid, except as required by applicable law or as specifically provided in these terms.</p>
                        <p><strong>Monthly Subscriptions:</strong> There are no refunds for monthly subscriptions once the billing period has commenced.</p>
                        <p><strong>Annual Subscriptions:</strong> If you cancel within the first 7 days of an annual subscription, you may be eligible for a refund. Contact support for assistance.</p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">3. Processing Time</h2>
                        <p>If a refund is approved, it will be processed within 5-7 business days and credited back to the original method of payment.</p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">4. Contact Us</h2>
                        <p>For any billing queries or refund requests, please email us at <a href="mailto:hypechart@zohomail.in" className="text-neon hover:underline">billing@hypechart.co</a>.</p>
                    </div>
                </div>
            </div>
            <Footer />
        </main>
    );
}
