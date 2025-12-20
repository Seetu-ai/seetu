export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              Seetu
            </span>
          </div>
        </div>

        {/* Content */}
        {children}

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-8">
          Studio Photo IA pour les entreprises africaines
        </p>
      </div>
    </div>
  );
}
