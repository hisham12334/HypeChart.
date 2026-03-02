"use client"
import { useState } from "react";
import { apiClient } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PaymentsSettingsPage() {
  const [tier, setTier] = useState<"STARTER" | "PRO">("STARTER");

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments & Payouts</h1>
        <p className="text-muted-foreground text-lg mt-2">
          Choose how you get paid. Switch to PRO for 0% platform commissions.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* SECTION 1: STARTER TIER */}
        <Card className={tier === "STARTER" ? "border-primary" : "opacity-75"}>
          <CardHeader>
            <CardTitle>Hype Starter (1% Fee)</CardTitle>
            <CardDescription>Direct deposit to your bank account. Handled by our gateway.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Beneficiary Name</Label>
              <Input placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input type="password" placeholder="0000000000" />
            </div>
            <div className="space-y-2">
              <Label>IFSC Code</Label>
              <Input placeholder="HDFC0001234" />
            </div>
            <Button className="w-full mt-4" onClick={() => setTier("STARTER")}>
              Save Bank Details
            </Button>
          </CardContent>
        </Card>

        {/* SECTION 2: PRO TIER */}
        <Card className={tier === "PRO" ? "border-primary" : "opacity-75"}>
          <CardHeader>
            <CardTitle>Hype Pro (0% Fee)</CardTitle>
            <CardDescription>Bring your own Razorpay gateway. Money goes directly to you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Razorpay Key ID</Label>
              <Input placeholder="rzp_live_xxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label>Razorpay Key Secret</Label>
              <Input type="password" placeholder="••••••••••••••••" />
            </div>
            <Button className="w-full mt-4" variant="secondary" onClick={() => setTier("PRO")}>
              Connect Gateway
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}