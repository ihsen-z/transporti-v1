export default function AppLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-brand-600/20 rounded-full"></div>
          <div className="w-12 h-12 border-4 border-primary-700 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
        </div>
        <p className="text-sm text-neutral-500 font-medium">Chargement...</p>
      </div>
    </div>
  );
}
