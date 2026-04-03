'use client';

import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { paymentSettingsApi, whatsappSettingsApi, apiClient } from '@/lib/api-client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function PaymentsSettingsPage() {
  const [tier, setTier] = useState<"STARTER" | "PRO">("STARTER");

  // --- UPI DIRECT STATE ---
  const [upiId, setUpiId] = useState('');

  // --- PRO FORM STATE ---
  const [apiKeys, setApiKeys] = useState({ keyId: "", keySecret: "" });
  const [isSavingKeys, setIsSavingKeys] = useState(false);

  // --- WHATSAPP FORM STATE ---
  const [whatsapp, setWhatsapp] = useState({ phoneNumberId: "", token: "", enabled: false });
  const [waLoading, setWaLoading] = useState(true);
  const [waSaving, setWaSaving] = useState(false);
  const [waConnected, setWaConnected] = useState(false);

  // Load saved WhatsApp settings on mount
  useEffect(() => {
    const load = async () => {
      try {
        // Load UPI ID
        try {
          const userRes = await apiClient.get('/auth/me');
          if (userRes.data.user?.upiId) setUpiId(userRes.data.user.upiId);
        } catch (_) {
          // Silently fail
        }

        const res = await whatsappSettingsApi.get();
        if (res.success) {
          setWhatsapp({
            phoneNumberId: res.data.phoneNumberId || "",
            token: res.data.token || "",
            enabled: res.data.enabled,
          });
          setWaConnected(res.data.hasToken && !!res.data.phoneNumberId);
        }
      } catch (_) {
        // Silently fail — not critical for page load
      } finally {
        setWaLoading(false);
      }
    };
    load();
  }, []);

  // --- HANDLERS ---
  const handleSaveKeys = async () => {
    if (!apiKeys.keyId || !apiKeys.keySecret) {
      toast.error("Please provide both Key ID and Key Secret");
      return;
    }
    try {
      setIsSavingKeys(true);
      await paymentSettingsApi.saveApiKeys(apiKeys);
      toast.success("Razorpay API Keys saved! Your gateway is now active.");
      setTier("PRO");
      setApiKeys({ keyId: "", keySecret: "" }); // Clear form after save
    } catch (error: any) {
      toast.error(error.message || "Failed to save API keys");
    } finally {
      setIsSavingKeys(false);
    }
  };

  const handleSaveWhatsApp = async () => {
    if (!whatsapp.phoneNumberId) {
      toast.error("Please enter your WhatsApp Phone Number ID");
      return;
    }
    if (!whatsapp.token || whatsapp.token.trim() === '') {
      toast.error("Please enter your WhatsApp Access Token");
      return;
    }
    try {
      setWaSaving(true);
      await whatsappSettingsApi.save(whatsapp);
      toast.success("WhatsApp Business settings saved!");
      setWaConnected(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save WhatsApp settings");
    } finally {
      setWaSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">

      {/* ── Page Header ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments &amp; Payouts</h1>
        <p className="text-muted-foreground text-lg mt-2">
          Use Hypechart&apos;s managed gateway or connect your own Razorpay account for direct payments.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">

        {/* ══════════════════════════════════════════════════════════
            STARTER TIER — Hypechart Managed Gateway
            ⚠️  Razorpay Route (bank split-transfer) is NOT currently
                enabled on Hypechart's business account.
                The bank-linking form is therefore DISABLED.
                Settlements are paid manually as agreed.
        ══════════════════════════════════════════════════════════ */}
        <Card className={tier === "STARTER" ? "border-primary" : "opacity-70"}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>Hype Starter</CardTitle>
                <CardDescription className="mt-1">
                  Managed by Hypechart — zero setup required.
                </CardDescription>
              </div>
              <span className="shrink-0 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1">
                Default
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* How payments work */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-2 text-blue-900">
              <p className="font-semibold text-blue-800">How your payments work</p>
              <ul className="space-y-2 text-blue-700">
                <li className="flex gap-2">
                  <span className="shrink-0 mt-0.5">✅</span>
                  <span>
                    All customer payments are processed through{' '}
                    <strong>Hypechart&apos;s Razorpay account</strong> — no setup needed on your end.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 mt-0.5">✅</span>
                  <span>
                    Your earnings are <strong>settled directly to your bank account</strong> on the
                    payout schedule agreed with Hypechart.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 mt-0.5">✅</span>
                  <span>
                    A <strong>0.7% platform fee</strong> and Razorpay&apos;s standard{' '}
                    <strong>2% processing fee</strong> are deducted before settlement.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 mt-0.5">📊</span>
                  <span>
                    Every transaction is visible in the <strong>Payments</strong> dashboard with a
                    full fee breakdown.
                  </span>
                </li>
              </ul>
            </div>

            {/* Route-pending notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
              <span className="shrink-0 mt-0.5">ℹ️</span>
              <span>
                <strong>Automated bank-account linking is temporarily unavailable.</strong>{' '}
                Razorpay Route (the feature that enables real-time split transfers) requires a special
                approval from Razorpay which is currently pending for Hypechart. Until approval,
                settlements are processed manually by the Hypechart team on the agreed schedule.
                No action is required from you.
              </span>
            </div>

            <Button className="w-full" variant="outline" disabled>
              Currently Active — No Action Needed
            </Button>
          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════════════════════
            PRO TIER — Bring Your Own Gateway (BYOG)
            Brand saves their own Razorpay Key ID + Key Secret.
            On checkout, the system dynamically switches to the brand's
            Razorpay instance — money goes directly into their account.
            0% Hypechart fee; only Razorpay's normal fee applies.
        ══════════════════════════════════════════════════════════ */}
        <Card className={tier === "PRO" ? "border-primary" : "opacity-70"}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>Hype Pro</CardTitle>
                <CardDescription className="mt-1">
                  Connect your own Razorpay — 0% platform fee.
                </CardDescription>
              </div>
              <span className="shrink-0 text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 rounded-full px-2.5 py-1">
                Pro
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* How it works */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm space-y-2 text-purple-900">
              <p className="font-semibold text-purple-800">How it works</p>
              <ul className="space-y-2 text-purple-700">
                <li className="flex gap-2">
                  <span className="shrink-0 mt-0.5">🚀</span>
                  <span>
                    Every customer payment is created using <strong>your own Razorpay account</strong>.
                    Money lands in your account directly — Hypechart never touches it.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 mt-0.5">💸</span>
                  <span>
                    <strong>0% platform fee</strong> from Hypechart. Only Razorpay&apos;s standard
                    2% processing fee applies.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 mt-0.5">🔒</span>
                  <span>
                    Your Key Secret is stored <strong>AES-256-GCM encrypted</strong> — never readable
                    in plain text, even internally.
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pro-key-id">Razorpay Key ID</Label>
              <Input
                id="pro-key-id"
                placeholder="rzp_live_xxxxxxxxx"
                value={apiKeys.keyId}
                onChange={(e) => setApiKeys({ ...apiKeys, keyId: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Razorpay Dashboard → Settings → API Keys
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pro-key-secret">Razorpay Key Secret</Label>
              <Input
                id="pro-key-secret"
                type="password"
                placeholder="••••••••••••••••"
                value={apiKeys.keySecret}
                onChange={(e) => setApiKeys({ ...apiKeys, keySecret: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Encrypted at rest with AES-256-GCM</p>
            </div>

            <Button
              id="pro-connect-btn"
              className="w-full"
              onClick={handleSaveKeys}
              disabled={isSavingKeys}
            >
              {isSavingKeys ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving Keys…
                </>
              ) : (
                "Connect My Razorpay Gateway"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ══ UPI DIRECT ══ */}
      <Card>
        <CardHeader>
          <CardTitle>UPI Direct</CardTitle>
          <CardDescription>
            Customers pay directly to your UPI ID. Instant settlement, zero fees.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upi-id">Your UPI ID</Label>
            <Input
              id="upi-id"
              placeholder="yourname@okaxis"
              value={upiId}
              onChange={e => setUpiId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find this in your GPay / PhonePe / bank app settings
            </p>
          </div>
          <Button
            onClick={async () => {
              try {
                const res = await apiClient.post('/upi/settings', { upiId });
                if (res.data.success) toast.success('UPI ID saved successfully');
                else toast.error('Failed to save UPI ID');
              } catch (err: any) {
                toast.error(err.response?.data?.error || 'Failed to save UPI ID');
              }
            }}
            className="w-fit"
          >
            Save UPI ID
          </Button>
        </CardContent>
      </Card>

      {/* ══ NOTIFICATIONS ══ */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
        <p className="text-muted-foreground mt-1">
          Automatically message your customers on WhatsApp when their order status changes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle>WhatsApp Business</CardTitle>
                <CardDescription>Automated order updates via Meta WhatsApp Cloud API</CardDescription>
              </div>
            </div>
            {!waLoading && (
              <div
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${waConnected
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}
              >
                {waConnected
                  ? <><CheckCircle2 className="h-3.5 w-3.5" /> Connected</>
                  : <><XCircle className="h-3.5 w-3.5" /> Not configured</>
                }
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {waLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
                <p className="font-semibold">How to get your credentials:</p>
                <ol className="list-decimal ml-4 space-y-1 text-blue-700">
                  <li>Go to <strong>Meta Developers</strong> → Your App → WhatsApp → API Setup</li>
                  <li>Copy the <strong>Phone Number ID</strong></li>
                  <li>Generate a <strong>Permanent Access Token</strong> from Meta Business Settings</li>
                </ol>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wa-phone-id">Phone Number ID</Label>
                  <Input
                    id="wa-phone-id"
                    placeholder="123456789012345"
                    value={whatsapp.phoneNumberId}
                    onChange={(e) => setWhatsapp({ ...whatsapp, phoneNumberId: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Meta Developers → WhatsApp → API Setup
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wa-token">Access Token</Label>
                  <Input
                    id="wa-token"
                    type="password"
                    placeholder="EAAxxxxxxxxxxxxxxx"
                    value={whatsapp.token}
                    onChange={(e) => setWhatsapp({ ...whatsapp, token: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use a permanent token for production
                  </p>
                </div>
              </div>

              {/* Enable toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-sm">Enable WhatsApp Notifications</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Customers receive messages when their order is confirmed, shipped, or delivered
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  id="wa-enable-toggle"
                  aria-checked={whatsapp.enabled}
                  onClick={() => setWhatsapp({ ...whatsapp, enabled: !whatsapp.enabled })}
                  className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${whatsapp.enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${whatsapp.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>

              <Button
                id="wa-save-btn"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={handleSaveWhatsApp}
                disabled={waSaving}
              >
                {waSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
                ) : (
                  <><MessageCircle className="h-4 w-4 mr-2" /> Save WhatsApp Settings</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}