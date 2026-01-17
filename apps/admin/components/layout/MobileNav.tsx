'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    Users,
    BarChart3,
    Settings
} from 'lucide-react';

const routes = [
    { label: 'Home', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Products', icon: ShoppingBag, href: '/products' },
    { label: 'Orders', icon: Package, href: '/orders' },
    { label: 'CRM', icon: Users, href: '/customers' },
    { label: 'Stats', icon: BarChart3, href: '/analytics' },
];

export function MobileNav() {
    const pathname = usePathname();

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-lg border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-16 px-2">
                {routes.map((route) => {
                    const isActive = pathname === route.href;
                    return (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                                isActive ? "text-neon" : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            <route.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                            <span className="text-[10px] uppercase font-bold tracking-wider">{route.label}</span>
                        </Link>
                    )
                })}
                {/* Settings as a smaller separate or merged? Let's add it or leave for profile. 
                    5 items is usually max for good tap targets. Let's keep 5 main ones. 
                */}
            </div>
        </div>
    );
}
