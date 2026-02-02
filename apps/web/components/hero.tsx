"use client";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { BorderBeam } from "./border-beam";

export const Hero = () => {
    const scrollToForm = () => {
        document.getElementById("join-form")?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden bg-background">
            {/* Background Grid Effect */}
            <div className="absolute inset-0 bg-[size:50px_50px] bg-grid opacity-[0.1]" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />

            {/* Logo */}
            <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20">
                <span className="text-xl font-black text-white uppercase tracking-tighter">
                    Hype<span className="text-neon">Chart</span>
                </span>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 max-w-5xl mx-auto space-y-6 md:space-y-8"
            >
                <h1 className="text-4xl md:text-8xl font-black tracking-tighter text-white uppercase leading-[0.9]">
                    The Hype is <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Real.</span> <br />
                    The Burnout is <span className="text-neon">Optional.</span>
                </h1>

                <p className="text-lg md:text-2xl text-gray-400 max-w-2xl mx-auto font-medium">
                    You built a cult, not a customer service department. <br />
                    Stop replying to "Price?" DMs. Start selling out in seconds.
                </p>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={scrollToForm}
                    className="group relative inline-flex items-center gap-3 px-6 py-3 text-base md:px-8 md:py-4 md:text-lg bg-black text-white font-bold tracking-wide uppercase rounded-full border border-white/10 hover:border-neon hover:shadow-[0_0_30px_rgba(57,255,20,0.5)] transition-all duration-300 cursor-pointer"
                >
                    Start My First Drop (Free).
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-neon" />
                </motion.button>

                <p className="text-sm text-gray-600 tracking-widest uppercase">
                    No Credit Card • No Dev Skills
                </p>
            </motion.div>
            <BorderBeam />
        </section>
    );
};