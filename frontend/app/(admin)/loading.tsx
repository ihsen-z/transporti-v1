export default function AdminLoading() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-slate-200 rounded-full"></div>
                    <div className="w-12 h-12 border-4 border-slate-800 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
                </div>
                <p className="text-sm text-gray-500 font-medium">Chargement admin...</p>
            </div>
        </div>
    );
}
