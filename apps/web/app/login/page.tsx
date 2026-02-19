"use client";
import { useEffect } from 'react';

export default function LoginPage() {
    // The Admin Dashboard URL. 
    // In production, this must be the URL where your Admin App is hosted (e.g. app.hype-chart.com)
    // In development, it is http://localhost:3001
    const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || (process.env.NODE_ENV === 'production' ? 'https://app.hype-chart.com' : 'http://localhost:3001');

    useEffect(() => {
        // Redirect to the Admin Login page
        window.location.href = `${ADMIN_URL}/login`;
    }, []);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
            <p>Redirecting to dashboard...</p>
        </div>
    );
}