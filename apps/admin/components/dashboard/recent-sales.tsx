// Clean version without unused imports
export function RecentSales({ products }: { products: any[] }) {
    if (products.length === 0) return <div className="text-sm text-gray-500">Inventory looks good!</div>;

    return (
        <div className="space-y-8">
            {products.map((variant) => (
                <div key={variant.id} className="flex items-center">
                    <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">
                        !
                    </div>
                    <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{variant.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                            {variant.name}
                        </p>
                    </div>
                    <div className="ml-auto font-bold text-red-600">
                        {variant.inventoryCount} left
                    </div>
                </div>
            ))}
        </div>
    )
}