import Link from "next/link";
import { Footer } from "../../components/footer";

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-background selection:bg-neon selection:text-black flex flex-col">
            <nav className="p-4 md:p-6 border-b border-white/10">
                <Link href="/" className="text-sm font-bold text-white hover:text-neon uppercase tracking-widest transition-colors">← Back to Hypechart</Link>
            </nav>
            <div className="flex-1 max-w-4xl mx-auto px-6 py-16 md:py-24 w-full">
                <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-8 md:mb-12">Terms & Conditions</h1>
                <div className="space-y-8 text-gray-400 leading-relaxed text-lg">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">1. Introduction</h2>
                        <p>Welcome to Hypechart Technologies ("Company", "we", "our", "us"). These Terms and Conditions ("Terms", "Terms and Conditions") govern your use of our website and SaaS application (the "Service") operated by Hypechart Technologies.</p>
                        <p>By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.</p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">2. SaaS Services</h2>
                        <p>Hypechart provides an automated order management system designed for streetwear brands and drop culture businesses. The Service allows you to manage orders, inventory, and customer interactions.</p>
                        <p>We reserve the right to withdraw or amend our Service, and any service or material we provide via the Service, in our sole discretion without notice.</p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">3. Subscriptions</h2>
                        <p>Some parts of the Service are billed on a subscription basis ("Subscription(s)"). You will be billed in advance on a recurring and periodic basis ("Billing Cycle"). Billing cycles are set either on a monthly or annual basis, depending on the type of subscription plan you select when purchasing a Subscription.</p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">4. Accounts</h2>
                        <p>When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">5. Intellectual Property</h2>
                        <p>The Service and its original content, features, and functionality are and will remain the exclusive property of Hypechart Technologies and its licensors. The Service is protected by copyright, trademark, and other laws of both India and foreign countries.</p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">6. Contact Us</h2>
                        <p>If you have any questions about these Terms, please contact us at: <a href="mailto:hypechart@zohomail.in" className="text-neon hover:underline">hello@hypechart.co</a></p>
                    </div>
                </div>
            </div>
            <Footer />
        </main>
    );
}
