import Link from "next/link";
import { Footer } from "../../components/footer";

export default function ShippingPage() {
    return (
        <main className="min-h-screen bg-background selection:bg-neon selection:text-black flex flex-col">
            <nav className="p-6 border-b border-white/10">
                <Link href="/" className="text-sm font-bold text-white hover:text-neon uppercase tracking-widest transition-colors">← Back to Hypechart</Link>
            </nav>
            <div className="flex-1 max-w-4xl mx-auto px-6 py-24 w-full">
                <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-12">Shipping & Delivery Policy</h1>
                <div className="space-y-8 text-gray-400 leading-relaxed text-lg">

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">1. Digital Delivery</h2>
                        <p>Hypechart Technologies Pvt Ltd is a Software as a Service (SaaS) provider. We do not ship physical products.</p>
                        <p>Upon successful payment and subscription, you will receive immediate access to the Hypechart platform and all features included in your purchased plan. Confirmation and login details will be sent to your registered email address.</p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">2. Service Availability</h2>
                        <p>Our services are available globally and are accessed online. There are no shipping fees or delivery times associated with our service.</p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">3. Issues with Access</h2>
                        <p>If you do not receive access to the platform immediately after purchase, please contact our support team at <a href="mailto:support@hypechart.co" className="text-neon hover:underline">support@hypechart.co</a> with your transaction details.</p>
                    </div>
                </div>
            </div>
            <Footer />
        </main>
    );
}
