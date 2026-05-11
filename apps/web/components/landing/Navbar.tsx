"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold tracking-tight">
          Career<span className="text-blue-600">Vue</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
          <a href="#tutors" className="hover:text-gray-900 transition-colors">Tutors</a>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get started free
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3">
          <a href="#features" className="block text-sm font-medium text-gray-700 hover:text-gray-900 py-2" onClick={() => setMenuOpen(false)}>
            Features
          </a>
          <a href="#how-it-works" className="block text-sm font-medium text-gray-700 hover:text-gray-900 py-2" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
          <a href="#tutors" className="block text-sm font-medium text-gray-700 hover:text-gray-900 py-2" onClick={() => setMenuOpen(false)}>
            Tutors
          </a>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/login" className="text-sm font-medium text-gray-700 text-center py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="text-sm font-semibold bg-blue-600 text-white text-center py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
