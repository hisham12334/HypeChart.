import { Hero } from "../components/hero";
import { RealityCheck } from "../components/reality-check";
import { Solution } from "../components/solution";
import { CTAForm } from "../components/cta-form";
import { BorderBeam } from "../components/border-beam";

// Simple components defined inline for sections 4, 5, 6, 7, 8 to save file count
// while maintaining the high-tier structure.

const Comparison = () => (
    <section className="py-24 bg-black border-y border-white/10 relative">
        <BorderBeam />
        <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-black text-white uppercase text-center mb-12">The Manual Hustle vs. The Hypechart Flow</h2>
            <div className="grid grid-cols-2 gap-px bg-white/10 border border-white/10">
                <div className="bg-surface p-8">
                    <h3 className="text-red-500 font-bold uppercase mb-6">The Old Way (Pain) 🥵</h3>
                    <ul className="space-y-4 text-gray-400 text-sm">
                        <li>• Customer waits 15 mins for reply</li>
                        <li>• "Is this still available?"</li>
                        <li>• Your sanity + lost sales</li>
                        <li className="text-white font-bold pt-4">Result: Burnout</li>
                    </ul>
                </div>
                <div className="bg-background p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-neon/10 blur-xl" />
                    <h3 className="text-neon font-bold uppercase mb-6">The Hypechart Way 🚀</h3>
                    <ul className="space-y-4 text-gray-300 text-sm">
                        <li>• Customer buys in 30 seconds</li>
                        <li>• "Order Confirmed"</li>
                        <li>• Free to start</li>
                        <li className="text-white font-bold pt-4">Result: Sold Out</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>
);

const SocialProof = () => (
    <section className="py-24 bg-surface px-4 relative">
        <BorderBeam />
        <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-xs font-bold text-neon uppercase tracking-widest mb-12">From "Overwhelmed" to "Overjoyed"</h2>
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-black p-8 border border-white/5 text-left">
                    <p className="text-gray-300 italic mb-6">"I used to dread Fridays. 300 DMs. Panic. Chaos. Now? I post the link, pour a drink, and watch the 'Sold Out' notifications roll in."</p>
                    <p className="text-white font-bold text-sm">— Founder, 12K Followers (Streetwear)</p>
                </div>
                <div className="bg-black p-8 border border-white/5 text-left">
                    <p className="text-gray-300 italic mb-6">"My customers actually thanked me. They hated waiting for my replies just as much as I hated typing them."</p>
                    <p className="text-white font-bold text-sm">— Curator, 8K Followers (Vintage)</p>
                </div>
            </div>
        </div>
    </section>
);

const Footer = () => (
    <footer className="py-12 bg-black border-t border-white/10 text-center relative">
        <BorderBeam />
        <p className="text-gray-600 text-sm uppercase tracking-widest">© 2026 Hypechart. Respect the Drop.</p>
    </footer>
);

export default function Home() {
    return (
        <main className="min-h-screen bg-background selection:bg-neon selection:text-black">
            <Hero />
            <RealityCheck />
            <Solution />
            <Comparison />
            <SocialProof />
            <CTAForm />
            <Footer />
        </main>
    );
}