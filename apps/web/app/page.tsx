import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-white">
      <h1 className="text-5xl font-bold text-gray-900 mb-4">
        Career<span className="text-blue-600">Vue</span>
      </h1>
      <p className="text-xl text-gray-600 mb-10 max-w-xl">
        Your AI-powered career development platform. Get assessed, get a roadmap, get placed.
      </p>
      <div className="flex gap-4">
        <Link
          href="/(auth)/login"
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/(auth)/register"
          className="px-6 py-3 border border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}
