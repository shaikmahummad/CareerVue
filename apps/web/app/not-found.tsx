import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-[#6c63ff]/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl font-bold text-[#6c63ff]">404</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-sm text-[#7c7a8a] mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 btn-primary px-6 py-3 rounded-xl text-sm font-semibold"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-[#7c7a8a] border border-white/[0.07] hover:text-white hover:border-white/20 transition-all"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
