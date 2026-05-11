"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Brain,
  Map,
  BookOpen,
  Trophy,
  BarChart3,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Star,
} from "lucide-react";
import Navbar from "../components/landing/Navbar";

// ─── Animation helpers ────────────────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Brain,
    title: "AI Skill Assessment",
    description:
      "A 20-question adaptive quiz identifies your strengths and gaps across every topic in your chosen field.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Map,
    title: "Personalized Roadmap",
    description:
      "Claude AI generates a step-by-step learning plan tailored to exactly where you are and where you want to go.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: BookOpen,
    title: "Expert Courses",
    description:
      "Courses created and reviewed by verified industry professionals — video, notes, and quizzes in one place.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description:
      "Module-by-module completion tracking with XP points, streaks, and visual progress indicators.",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: Trophy,
    title: "Verified Certificates",
    description:
      "Earn a shareable certificate after completing each course — add it directly to your LinkedIn profile.",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  {
    icon: MessageSquare,
    title: "Community Discussions",
    description:
      "Ask questions, share insights, and learn alongside thousands of students on the same journey.",
    color: "text-pink-600",
    bg: "bg-pink-50",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Take the AI Quiz",
    description:
      "Answer 20 targeted questions about your chosen career goal. Takes less than 10 minutes.",
  },
  {
    number: "02",
    title: "Get Your Roadmap",
    description:
      "Our AI analyses your answers and generates a prioritised learning path — specific to your skill gaps.",
  },
  {
    number: "03",
    title: "Learn & Get Placed",
    description:
      "Work through curated courses, earn certificates, and build a portfolio that gets you hired.",
  },
];

const STATS = [
  { value: "2,400+", label: "Students enrolled" },
  { value: "180+", label: "Courses live" },
  { value: "60+", label: "Expert tutors" },
  { value: "87%", label: "Placement rate" },
];

const TUTOR_BENEFITS = [
  "Set your own price and schedule",
  "AI-assisted course creation tools",
  "Reach students across India",
  "Monthly payouts via Razorpay",
  "Real-time analytics dashboard",
];

const SKILL_BADGES = [
  "Python", "React", "Machine Learning", "Node.js",
  "Data Science", "DevOps", "SQL", "TypeScript",
];

// ─── Sections ─────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white pt-16">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-blue-100/60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-100/50 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
        {/* Text */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6"
          >
            <Sparkles size={14} />
            AI-Powered Career Development
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6"
          >
            Land your dream{" "}
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              tech job
            </span>{" "}
            with a personalised roadmap
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg"
          >
            Take a 10-minute AI skill quiz, get a personalised learning roadmap,
            and work through expert-led courses — all in one platform built for
            Indian students and freshers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-3 mb-10"
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              Get started free <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 font-semibold px-7 py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Sign in
            </Link>
          </motion.div>

          {/* Skill badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-wrap gap-2"
          >
            {SKILL_BADGES.map((skill) => (
              <span
                key={skill}
                className="text-xs font-medium bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full"
              >
                {skill}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Hero visual — stylised app mockup */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="hidden lg:block"
        >
          <div className="relative">
            {/* Main card */}
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Skill Assessment</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">Frontend Developer</p>
                </div>
                <div className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                  In Progress
                </div>
              </div>

              <div className="space-y-3">
                {["React & JSX", "TypeScript", "CSS & Tailwind", "State Management"].map(
                  (skill, i) => (
                    <div key={skill}>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{skill}</span>
                        <span className="font-medium">{[82, 65, 91, 48][i]}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${[82, 65, 91, 48][i]}%` }}
                          transition={{ duration: 1, delay: 0.6 + i * 0.1, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            [82, 65, 91, 48][i] >= 80
                              ? "bg-emerald-500"
                              : [82, 65, 91, 48][i] >= 60
                              ? "bg-blue-500"
                              : "bg-orange-400"
                          }`}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Floating roadmap card */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-8 -left-10 bg-white rounded-xl shadow-xl border border-gray-100 p-4 w-52"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Map size={14} className="text-violet-600" />
                </div>
                <span className="text-xs font-semibold text-gray-800">Your Roadmap</span>
              </div>
              <div className="space-y-2">
                {["Complete React basics", "Learn TypeScript", "Build 3 projects"].map(
                  (step, i) => (
                    <div key={step} className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                          i === 0 ? "bg-emerald-100" : "bg-gray-100"
                        }`}
                      >
                        {i === 0 ? (
                          <CheckCircle2 size={10} className="text-emerald-600" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        )}
                      </div>
                      <span className="text-xs text-gray-600">{step}</span>
                    </div>
                  )
                )}
              </div>
            </motion.div>

            {/* Floating rating card */}
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -top-6 -right-6 bg-white rounded-xl shadow-xl border border-gray-100 p-3 w-40"
            >
              <div className="flex items-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={11} className="fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-xs font-semibold text-gray-800">&ldquo;Got placed in 3 months!&rdquo;</p>
              <p className="text-xs text-gray-400 mt-0.5">— Priya S., SDE @ Flipkart</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="bg-blue-600 py-14">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.1} className="text-center">
              <p className="text-3xl lg:text-4xl font-bold text-white">{stat.value}</p>
              <p className="text-blue-200 text-sm mt-1">{stat.label}</p>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <p className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-3">
            Features
          </p>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything you need to level up
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-lg">
            From assessment to placement — CareerVue has every tool your career journey needs.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 0.07}>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 h-full">
                <div className={`w-11 h-11 ${feature.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon size={20} className={feature.color} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <p className="text-blue-600 font-semibold text-sm uppercase tracking-wider mb-3">
            How it works
          </p>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            From zero to job-ready in 3 steps
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-lg">
            No guesswork. No wasted time. Just a clear, AI-generated path forward.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-blue-200 via-violet-200 to-blue-200" />

          {STEPS.map((step, i) => (
            <FadeIn key={step.number} delay={i * 0.15} className="relative">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
                  <span className="text-2xl font-bold text-white">{step.number}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn className="text-center mt-14">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-8 py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            Start your assessment — it&apos;s free <ArrowRight size={16} />
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

function TutorSection() {
  return (
    <section id="tutors" className="py-24 bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900">
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <FadeIn>
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-wider mb-4">
            For Tutors
          </p>
          <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
            Share your expertise.{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Earn from anywhere.
            </span>
          </h2>
          <p className="text-blue-200/80 text-lg mb-10 leading-relaxed">
            Join 60+ expert tutors already teaching on CareerVue. Create your course
            once, earn every time a student enrolls.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-gray-900 font-semibold px-7 py-3.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Become a Tutor <ArrowRight size={16} />
          </Link>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="space-y-4">
            {TUTOR_BENEFITS.map((benefit, i) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={16} className="text-blue-400" />
                </div>
                <span className="text-white font-medium">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-r from-blue-600 to-violet-600">
      <FadeIn className="text-center max-w-2xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-white mb-4">
          Your career breakthrough starts today
        </h2>
        <p className="text-blue-100 text-lg mb-8">
          Join thousands of students who used CareerVue to go from confused to confident — and placed.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors shadow-xl"
          >
            Get started free <ArrowRight size={16} />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 border border-white/30 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors"
          >
            Already have an account
          </Link>
        </div>
      </FadeIn>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-14">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <p className="text-xl font-bold text-white mb-2">
              Career<span className="text-blue-500">Vue</span>
            </p>
            <p className="text-sm text-gray-500 max-w-xs">
              AI-powered career development for India&apos;s next generation of tech talent.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-300 mb-3">Product</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
              <li><Link href="/courses" className="hover:text-white transition-colors">Courses</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-300 mb-3">For Tutors</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/register" className="hover:text-white transition-colors">Become a tutor</Link></li>
              <li><a href="#tutors" className="hover:text-white transition-colors">Benefits</a></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-300 mb-3">Account</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Sign in</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Register</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} CareerVue. All rights reserved.
          </p>
          <p className="text-xs text-gray-600">Built for India&apos;s tech talent</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="bg-white">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TutorSection />
      <CTASection />
      <Footer />
    </div>
  );
}
