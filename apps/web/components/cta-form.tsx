"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { BorderBeam } from "./border-beam";

export const CTAForm = () => {
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');

        try {
            // Get form data
            const formData = new FormData(e.target as HTMLFormElement);
            const data = {
                brandName: formData.get('brandName'),
                instagram: formData.get('instagram'),
                email: formData.get('email')
            };

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/waitlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setStatus('success');
            } else {
                alert('Something went wrong. Please try again.');
                setStatus('idle');
            }
        } catch (err) {
            console.error(err);
            alert('Network error. Please try again.');
            setStatus('idle');
        }
    };

    if (status === 'success') {
        return (
            <section id="join-form" className="py-16 md:py-24 bg-neon flex items-center justify-center px-4 relative">
                <BorderBeam />
                <div className="text-center space-y-6 max-w-2xl relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black text-black uppercase">Welcome to the Tribe.</h2>
                    <p className="text-lg md:text-xl text-black/80 font-bold">We'll verify your Instagram handle and send your drop link within 24 hours.</p>
                </div>
            </section>
        );
    }

    return (
        <section id="join-form" className="py-16 md:py-24 bg-surface px-4 relative overflow-hidden">
            <BorderBeam />
            <div className="max-w-xl mx-auto relative z-10">
                <div className="text-center mb-8 md:mb-12">
                    <h2 className="text-3xl md:text-5xl font-black text-white uppercase mb-4">
                        Sell Out. <span className="text-gray-500">Don't Burn Out.</span>
                    </h2>
                    <p className="text-gray-400">Your next drop is in a few days. Do you want to spend it typing or celebrating?</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-neon uppercase tracking-widest mb-2">Brand Name</label>
                        <input name="brandName" required type="text" className="w-full bg-black border border-white/20 p-3 md:p-4 text-white focus:border-neon outline-none transition-colors" placeholder="e.g. Drip Kartel" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neon uppercase tracking-widest mb-2">Instagram Handle (Required)</label>
                        <input name="instagram" required type="text" className="w-full bg-black border border-white/20 p-3 md:p-4 text-white focus:border-neon outline-none transition-colors" placeholder="@yourbrand" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neon uppercase tracking-widest mb-2">Email</label>
                        <input name="email" required type="email" className="w-full bg-black border border-white/20 p-3 md:p-4 text-white focus:border-neon outline-none transition-colors" placeholder="founder@hypechart.com" />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={status === 'submitting'}
                        className="w-full bg-neon text-black font-black uppercase tracking-wide py-4 md:py-5 text-base md:text-lg hover:bg-neon/90 transition-colors mt-6 md:mt-8 cursor-pointer"
                    >
                        {status === 'submitting' ? 'Processing...' : 'Automate My Next Drop'}
                    </motion.button>

                    <p className="text-center text-xs text-gray-500 mt-4">
                        By clicking, you agree to join the waitlist. We respect the drop.
                    </p>
                </form>
            </div>
        </section>
    );
};