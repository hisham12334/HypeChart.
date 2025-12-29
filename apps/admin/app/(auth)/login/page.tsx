'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client'; // Ensure correct import path
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Send Login Request
      const res = await apiClient.post('/auth/login', formData);

      // 2. DEBUG: Log the response to see exactly what we got
      console.log("Login Response:", res.data);

      if (res.data.success) {
        // 3. SAFE EXTRACTION
        // The structure is: { success: true, token: "...", user: { id: "..." } }
        const token = res.data.token;
        const userId = res.data.user.id; // We need this for Cloudinary

        if (!token || !userId) {
          throw new Error("Login succeeded but token or user ID is missing.");
        }

        // 4. Save to Storage
        localStorage.setItem('token', token);
        localStorage.setItem('userId', userId);

        toast.success("Welcome back!");

        // 5. Force Refresh / Redirect
        // We use window.location to ensure the API Client picks up the new token immediately
        window.location.href = '/products';
      }
    } catch (error: any) {
      console.error("Login Failed:", error);

      const msg = error.response?.data?.error || "Invalid credentials";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="m@example.com"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Password</Label>
                {/* Optional: Add Forgot Password link later */}
              </div>
              <Input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center text-sm mt-4">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-blue-600 hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}