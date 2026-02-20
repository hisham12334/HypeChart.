import Link from "next/link";
import { BorderBeam } from "./border-beam";

export const Footer = () => (
    <footer className="py-16 md:py-24 bg-black border-t border-white/10 relative overflow-hidden">
        <BorderBeam />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 mb-12 md:mb-16">
                <div className="md:col-span-2">
                    <Link href="/" className="inline-block">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-6">Hypechart.</h3>
                    </Link>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-sm mb-6">
                        The automated order system for drop culture. We turn DMs into orders and chaos into cash flow. Respect the Drop.
                    </p>
                </div>

                <div>
                    <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Company</h4>
                    <ul className="space-y-4 text-sm text-gray-400">
                        <li><Link href="/about" className="hover:text-neon transition-colors">About</Link></li>
                        <li><Link href="/pricing" className="hover:text-neon transition-colors">Pricing (Pro)</Link></li>
                        <li><Link href="/" className="hover:text-neon transition-colors">Contact</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Legal</h4>
                    <ul className="space-y-4 text-sm text-gray-400">
                        <li><Link href="/terms" className="hover:text-neon transition-colors">Terms & Conditions</Link></li>
                        <li><Link href="/privacy" className="hover:text-neon transition-colors">Privacy Policy</Link></li>
                        <li><Link href="/refund" className="hover:text-neon transition-colors">Refund Policy</Link></li>
                        <li><Link href="/shipping" className="hover:text-neon transition-colors">Shipping Policy</Link></li>
                    </ul>
                </div>
            </div>

            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8 text-xs text-gray-600 uppercase tracking-widest">
                <p>© 2026 Hypechart. All rights reserved.</p>
                <div className="text-left md:text-right space-y-2">
                    <p className="font-bold text-gray-500">Hypechart Technologies</p>
                    <p>Payyanur, Trikkaripur, Kannur, Kerela - 671310</p>
                    <p>Contact: hypechart@zohomail.in</p>
                </div>
            </div>
        </div>
    </footer>
);
