"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

export function Overview({ data }: { data: any[] }) {
    if (data.length === 0) {
        return <div className="h-[350px] flex items-center justify-center text-gray-400">No sales data yet</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
                <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip
                    contentStyle={{ background: '#333', border: 'none', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="total" fill="#000000" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}