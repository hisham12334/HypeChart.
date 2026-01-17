import { Link, Lock, User } from "lucide-react";
import { BorderBeam } from "./border-beam";

export const Solution = () => {
    return (
        <section className="py-32 bg-background px-4 relative">
            <BorderBeam />
            <div className="max-w-6xl mx-auto text-center mb-20">
                <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-8">
                    Keep the Story. <br />
                    <span className="text-neon">Kill the DM.</span>
                </h2>
                <p className="text-xl text-gray-400">We don't replace Instagram. We just make it lethal.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
                {[
                    { icon: Link, title: "The Magic Link ⚡", desc: "One link per item. You post it on your Story. They click. They pick a size. They pay. No conversation." },
                    { icon: Lock, title: "First Click, First Served 🔒", desc: "No more fighting in the DMs. The system handles inventory. It’s fair. It’s fast. It’s ruthless." },
                    { icon: User, title: "You Stay You 🤝", desc: "You are not becoming a faceless corporation. You are still the Curator. You just stopped being the Clerk." }
                ].map((item, i) => (
                    <div key={i} className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto bg-white/5 rounded-full flex items-center justify-center">
                            <item.icon className="w-8 h-8 text-neon" />
                        </div>
                        <h3 className="text-xl font-bold text-white uppercase">{item.title}</h3>
                        <p className="text-gray-400">{item.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};