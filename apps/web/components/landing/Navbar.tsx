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
        scrolled ? "glass" : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="3" cy="11" r="2" fill="white" fillOpacity="0.9" />
              <circle cx="7" cy="7" r="1.5" fill="white" />
              <circle cx="11" cy="3" r="2.5" fill="white" fillOpacity="0.6" strokeDasharray="1 1" stroke="white" strokeWidth="0.5" />
              <line x1="3" y1="11" x2="7" y2="7" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
              <line x1="7" y1="7" x2="11" y2="3" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
            </svg>
          </div>
          <span className="text-[15px] font-bold text-white tracking-tight">CareerVue</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { label: "Features", href: "#features" },
            { label: "Tutors", href: "#tutors" },
            { label: "Pricing", href: "#pricing" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-[#7c7a8a] hover:text-white px-4 py-2 rounded-xl transition-colors hover:bg-white/5"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-[#7c7a8a] hover:text-white px-4 py-2 rounded-xl transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="btn-primary text-sm px-5 py-2.5 rounded-xl"
          >
            Get started free
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 rounded-xl text-[#7c7a8a] hover:text-white hover:bg-white/5 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-white/[0.07] px-6 py-4 space-y-1">
          {[
            { label: "Features", href: "#features" },
            { label: "Tutors", href: "#tutors" },
            { label: "Pricing", href: "#pricing" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="block text-sm font-medium text-[#7c7a8a] hover:text-white py-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-white/[0.07]">
            <Link
              href="/login"
              className="btn-secondary text-sm text-center py-2.5 px-4"
              onClick={() => setMenuOpen(false)}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="btn-primary text-sm text-center py-2.5 px-4"
              onClick={() => setMenuOpen(false)}
            >
              Get started free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
