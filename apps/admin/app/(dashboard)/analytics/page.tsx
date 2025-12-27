'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, TrendingUp, MapPin, Shirt, BarChart3 } from 'lucide-react';
import { SalesBySizeChart } from '@/components/analytics/sales-by-size'; // We will create this
import { TopCitiesList } from '@/components/analytics/top-cities'; // We will create this

export default function AnalyticsPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await apiClient.get('/analytics');
                if (res.data.success) {
                    setStats(res.data.data);
                }
            } catch (error) {
                console.error("Failed to load analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Analytics & Insights</h1>
                <p className="text-muted-foreground mt-2">Deep dive into your sales performance and customer demographics.</p>
            </div>

            {/* --- KPI ROW --- */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{Math.round(stats?.averageOrderValue || 0)}</div>
                        <p className="text-xs text-muted-foreground">Revenue per customer</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Selling Product</CardTitle>
                        <Shirt className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold truncate">
                            {stats?.topProducts?.[0]?.name || "N/A"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Generated ₹{stats?.topProducts?.[0]?.revenue || 0}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Location</CardTitle>
                        <MapPin className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{stats?.topCities?.[0]?.city || "N/A"}</div>
                        <p className="text-xs text-muted-foreground">Most active customer base</p>
                    </CardContent>
                </Card>
            </div>

            {/* --- CHARTS ROW --- */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

                {/* PIE CHART: Sizes */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Sales by Size</CardTitle>
                        <CardDescription>Which sizes are moving the fastest?</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <SalesBySizeChart data={stats?.salesBySize || []} />
                    </CardContent>
                </Card>

                {/* LIST: Top Cities */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Top Cities</CardTitle>
                        <CardDescription>Where are your drops shipping to?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TopCitiesList cities={stats?.topCities || []} />
                    </CardContent>
                </Card>
            </div>

            {/* --- TABLE: Product Performance --- */}
            <Card>
                <CardHeader>
                    <CardTitle>Product Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {stats?.topProducts?.map((product: any, i: number) => (
                            <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 font-bold text-xs text-violet-600">
                                        #{i + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">{product.qty} Units Sold</p>
                                    </div>
                                </div>
                                <div className="font-bold text-sm">₹{product.revenue}</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}