export const BorderBeam = () => {
    return (
        <div className="absolute inset-x-0 bottom-0 h-px w-full overflow-hidden pointer-events-none z-10">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon to-transparent w-full -translate-x-full animate-border-scan blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon to-transparent w-full -translate-x-full animate-border-scan" />
        </div>
    );
};
