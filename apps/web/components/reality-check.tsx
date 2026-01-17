"use client";
import { motion } from "framer-motion";
import { MessageSquareWarning, ReceiptIndianRupee, Ghost } from "lucide-react";
import { BorderBeam } from "./border-beam";

const painPoints = [
    {
        icon: MessageSquareWarning,
        title: "The 8:01 PM Panic Attack ",
        desc: "You drop the heat. The DMs flood in. 47 messages in 3 minutes. By the time you reply, they've left to watch Netflix."
    },
    {
        icon: ReceiptIndianRupee,
        title: 'The "Screenshot" Accountant ',
        desc: '"Bro, sent UPI check screenshot." "Ship to Mumbai?" You are spending 90% of your time being a chat-bot. Act like a Founder.'
    },
    {
        icon: Ghost,
        title: "The Ghost Buyers ",
        desc: "60% of people who view your Story want to buy RIGHT NOW. If you make them DM you, friction kills the vibe."
    }
];

export const RealityCheck = () => {
    return (
        <section className="py-24 bg-surface px-4 border-t border-white/5 relative">
            <BorderBeam />
            <div className="max-w-6xl mx-auto">
                <div className="mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-white uppercase mb-4">
                        The "8 PM Drop" is a <span className="text-red-500">War Zone.</span>
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {painPoints.map((point, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.2 }}
                            viewport={{ once: true }}
                            className="p-8 bg-background border border-white/10 hover:border-neon/50 transition-colors group"
                        >
                            <point.icon className="w-12 h-12 text-gray-500 group-hover:text-neon mb-6 transition-colors" />
                            <h3 className="text-xl font-bold text-white mb-4 uppercase">{point.title}</h3>
                            <p className="text-gray-400 leading-relaxed">{point.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};