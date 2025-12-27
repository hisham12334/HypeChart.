export function TopCitiesList({ cities }: { cities: any[] }) {
    if (!cities || cities.length === 0) return <div className="text-sm text-gray-500">No location data yet.</div>;

    // Find max for progress bar
    const maxCount = Math.max(...cities.map(c => c.count));

    return (
        <div className="space-y-6">
            {cities.map((city, i) => (
                <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize">{city.city}</span>
                        <span className="text-muted-foreground">{city.count} orders</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${(city.count / maxCount) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}