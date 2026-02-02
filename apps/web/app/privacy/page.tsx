import Link from "next/link";
import { Footer } from "../../components/footer";

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-background selection:bg-neon selection:text-black flex flex-col">
            <nav className="p-4 md:p-6 border-b border-white/10">
                <Link href="/" className="text-sm font-bold text-white hover:text-neon uppercase tracking-widest transition-colors">← Back to Hypechart</Link>
            </nav>
            <div className="flex-1 max-w-4xl mx-auto px-6 py-16 md:py-24 w-full">
                <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-8 md:mb-12">Privacy Policy</h1>
                <div className="space-y-8 text-gray-400 leading-relaxed text-lg">
                    <p>Last updated: January 24, 2026</p>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">1. Introduction</h2>
                        <p>Hypechart Technologies Pvt Ltd ("us", "we", or "our") operates the Hypechart website and application (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.</p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">2. Information Collection and Use</h2>
                        <p>We collect several different types of information for various purposes to provide and improve our Service to you.</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Personal Data:</strong> Email address, First name and last name, Phone number, Business details, Cookies and Usage Data.</li>
                            <li><strong>Usage Data:</strong> We may also collect information on how the Service is accessed and used.</li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">3. Use of Data</h2>
                        <p>Hypechart Technologies Pvt Ltd uses the collected data for various purposes:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>To provide and maintain the Service</li>
                            <li>To notify you about changes to our Service</li>
                            <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
                            <li>To provide customer care and support</li>
                            <li>To provide analysis or valuable information so that we can improve the Service</li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">4. Data Security</h2>
                        <p>The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.</p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">5. Third-Party Services</h2>
                        <p>We may employ third party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, to perform Service-related services or to assist us in analyzing how our Service is used. These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.</p>
                    </div>
                </div>
            </div>
            <Footer />
        </main>
    );
}
