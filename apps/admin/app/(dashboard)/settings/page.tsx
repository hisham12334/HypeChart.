'use client';

import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { whatsappSettingsApi, apiClient } from '@/lib/api-client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [upiId, setUpiId] = useState('');
  const [whatsapp, setWhatsapp] = useState({ phoneNumberId: "", token: "", enabled: false, ownerPhone: "" });
  const [waLoading, setWaLoading] = useState(true);
  const [waSaving, setWaSaving] = useState(false);
  const [waConnected, setWaConnected] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
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
            ownerPhone: res.data.ownerPhone || "",
          });
          setWaConnected(res.data.hasToken && !!res.data.phoneNumberId);
        }
      } catch (_) {
        // Silently fail - not critical for page load
      } finally {
        setWaLoading(false);
      }
    };

    load();
  }, []);

  const handleSaveWhatsApp = async () => {
    if (!whatsapp.phoneNumberId) {
      toast.error("Please enter your WhatsApp Phone Number ID");
      return;
    }
    if (!whatsapp.token || whatsapp.token.trim() === '') {
      toast.error("Please enter your WhatsApp Access Token");
      return;
    }
    if (!whatsapp.ownerPhone || whatsapp.ownerPhone.trim() === '') {
      toast.error("Please enter your WhatsApp number");
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Settings</h1>
        <p className="text-muted-foreground text-lg mt-2">
          Manage your direct UPI payment details and WhatsApp order notifications.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>UPI Direct</CardTitle>
          <CardDescription>
            Customers pay directly to your UPI ID. Instant settlement with no extra gateway setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upi-id">Your UPI ID</Label>
            <Input
              id="upi-id"
              placeholder="yourname@okaxis"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find this in your GPay, PhonePe, Paytm, or bank app settings.
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

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
        <p className="text-muted-foreground mt-1">
          Automatically message your customers and receive UTR confirmation alerts on WhatsApp.
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

              <div className="space-y-2">
                <Label htmlFor="wa-owner-phone">Your WhatsApp Number</Label>
                <Input
                  id="wa-owner-phone"
                  placeholder="919876543210"
                  value={whatsapp.ownerPhone}
                  onChange={(e) => setWhatsapp({ ...whatsapp, ownerPhone: e.target.value.replace(/\D/g, '') })}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the number where you want UTR alerts, for example: 919876543210
                </p>
              </div>

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
