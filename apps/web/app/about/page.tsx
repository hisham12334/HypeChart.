import Link from "next/link";
import { Footer } from "../../components/footer";
import { BorderBeam } from "../../components/border-beam";

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-background selection:bg-neon selection:text-black flex flex-col">
            <nav className="p-4 md:p-6 border-b border-white/10">
                <Link href="/" className="text-sm font-bold text-white hover:text-neon uppercase tracking-widest transition-colors">← Back to Hypechart</Link>
            </nav>

            <div className="flex-1 w-full">
                {/* Hero Section */}
                <section className="relative py-16 md:py-24 px-6 overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon/5 blur-[120px] rounded-full pointer-events-none" />
                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <h1 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter mb-8">
                            Built via<br /><span className="text-neon">the Culture.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                            We didn't just build an order system. We built the engine for the next generation of streetwear moguls.
                        </p>
                    </div>
                </section>

                {/* The Story */}
                <section className="py-16 md:py-24 bg-surface border-y border-white/5 relative">
                    <BorderBeam />
                    <div className="max-w-3xl mx-auto px-6">
                        <h2 className="text-xs font-bold text-neon uppercase tracking-widest mb-12">The Origin Story</h2>
                        <div className="space-y-8 text-lg text-gray-300 leading-relaxed">
                            <p>
                                <strong className="text-white">It started in the DMs.</strong> The chaos. "Price?" "Size?" "Available?"
                            </p>
                            <p>
                                We watched creative geniuses spend 90% of their time playing customer support agent and only 10% actually creating. The manual hustle was killing the vibe. Spreadsheets were messy. DMs were unmanageable.
                            </p>
                            <p>
                                We realized the tools that existed were for "retailers"—boring, corporate, stiff. They didn't understand the drop model. They didn't understand hype.
                            </p>
                            <p>
                                <strong className="text-white">So we built Hypechart.</strong>
                            </p>
                        </div>
                    </div>
                </section>

                {/* Mission */}
                <section className="py-16 md:py-24 px-6">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-xs font-bold text-neon uppercase tracking-widest mb-12">Our Mission</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase mb-4">Empower Creators</h3>
                                <p className="text-gray-400">Give brand owners the tech stack they deserve so they can focus on the art, not the admin.</p>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase mb-4">Kill the Noise</h3>
                                <p className="text-gray-400">Automate the boring stuff. Order tracking, inventory, payments—handled instantly.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <Footer />
        </main>
    );
}
