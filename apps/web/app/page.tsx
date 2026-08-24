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
  ArrowRight,
  Sparkles,
  Star,
  CheckCircle2,
  Zap,
  TrendingUp,
  Play,
  ChevronRight,
} from "lucide-react";
import Navbar from "../components/landing/Navbar";

/* ─── Animation helper ───────────────────────────────────────────────────── */

function FadeIn({
  children,
  delay = 0,
  className = "",
  direction = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "left" | "right" | "none";
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const variants = {
    up: { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 } },
    left: { initial: { opacity: 0, x: -28 }, animate: { opacity: 1, x: 0 } },
    right: { initial: { opacity: 0, x: 28 }, animate: { opacity: 1, x: 0 } },
    none: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  };
  const { initial, animate } = variants[direction];

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={inView ? animate : {}}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Data ───────────────────────────────────────────────────────────────── */

const STATS = [
  { value: "2,400+", label: "Students enrolled" },
  { value: "180+", label: "Courses live" },
  { value: "60+", label: "Expert tutors" },
  { value: "87%", label: "Placement rate" },
];

const STEPS = [
  {
    number: "01",
    title: "Take the Skill Assessment",
    description:
      "Answer 20 reviewed questions about your chosen career goal. Your results pinpoint skill gaps in under 10 minutes.",
    icon: Brain,
    color: "#6c63ff",
  },
  {
    number: "02",
    title: "Get Your Roadmap",
    description:
      "Receive a personalised, prioritised learning path built from your scores and CareerVue's approved course catalog.",
    icon: Map,
    color: "#00d4ff",
  },
  {
    number: "03",
    title: "Learn & Get Placed",
    description:
      "Work through expert-led courses, earn verified certificates, and build a portfolio that actually gets you hired.",
    icon: Trophy,
    color: "#6c63ff",
  },
];

const FEATURES = [
  {
    icon: Brain,
    title: "Verified Skill Assessment",
    description:
      "20-question adaptive quiz identifies your strengths and gaps across every topic in your chosen field.",
    glow: "rgba(108,99,255,0.2)",
  },
  {
    icon: Map,
    title: "Personalised Roadmap",
    description:
      "CareerVue builds a step-by-step learning plan from your assessment results and career goal.",
    glow: "rgba(0,212,255,0.2)",
  },
  {
    icon: BookOpen,
    title: "Expert-Led Courses",
    description:
      "Courses created by verified industry professionals — video, notes, and quizzes all in one place.",
    glow: "rgba(108,99,255,0.2)",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description:
      "Module-by-module completion with XP points, streaks, and visual progress indicators.",
    glow: "rgba(0,212,255,0.2)",
  },
  {
    icon: Trophy,
    title: "Verified Certificates",
    description:
      "Earn a shareable certificate after each course — add it directly to your LinkedIn profile.",
    glow: "rgba(108,99,255,0.2)",
  },
  {
    icon: MessageSquare,
    title: "Community + Mentors",
    description:
      "Ask questions, share insights, and connect with tutors who can guide your journey.",
    glow: "rgba(0,212,255,0.2)",
  },
];

const COURSES = [
  {
    title: "Advanced React Patterns & Performance Optimisation",
    category: "Web Development",
    instructor: "Liam Brown",
    rating: 4.9,
    students: "2.1k",
    price: "₹999",
    badge: "BESTSELLER",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  {
    title: "Machine Learning with Python & TensorFlow 2.0",
    category: "Data Science",
    instructor: "Ayesha Raza",
    rating: 4.8,
    students: "1.8k",
    price: "₹1,299",
    badge: "HOT",
    badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  },
  {
    title: "Zero Trust Architecture & Advanced Security Protocols",
    category: "Cybersecurity",
    instructor: "Dev Sharma",
    rating: 4.7,
    students: "890",
    price: "₹1,499",
    badge: "NEW",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
];

const TUTOR_BENEFITS = [
  "Set your own price and schedule",
  "Structured course creation tools",
  "Reach students across India",
  "Monthly payouts via Razorpay",
  "Real-time analytics dashboard",
];

const TESTIMONIALS = [
  {
    quote:
      "CareerVue didn't just suggest jobs — it mapped out a precise trajectory that shaved two years off my senior promotion.",
    name: "Aisha",
    role: "SDE III @ RAZORPAY",
    initials: "A",
  },
  {
    quote:
      "The roadmap was remarkably focused. Within 6 months of following it, I went from a tier-2 college grad to landing a role at a unicorn startup.",
    name: "Rahul M.",
    role: "Senior Engineer @ Groww",
    initials: "R",
  },
  {
    quote:
      "I've used Coursera and Udemy — nothing compares to a roadmap that responds directly to YOUR assessed skill gaps.",
    name: "Priya S.",
    role: "Data Scientist @ Meesho",
    initials: "P",
  },
];

/* ─── Mock Dashboard UI for Hero ─────────────────────────────────────────── */

function HeroDashboard() {
  const skills = [
    { name: "React & JSX", score: 82 },
    { name: "TypeScript", score: 65 },
    { name: "System Design", score: 54 },
    { name: "DSA", score: 42 },
  ];

  return (
    <div className="relative select-none">
      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="glass-card rounded-2xl p-6 w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] text-[#7c7a8a] font-medium uppercase tracking-wider">Skill Assessment</p>
            <p className="text-base font-semibold text-white mt-0.5">Full Stack Developer</p>
          </div>
          <span className="accent-chip text-[10px] font-semibold px-2.5 py-1 rounded-full">VERIFIED DATA</span>
        </div>

        <div className="space-y-3.5">
          {skills.map((skill, i) => (
            <div key={skill.name}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#7c7a8a]">{skill.name}</span>
                <span className="text-white font-medium">{skill.score}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${skill.score}%` }}
                  transition={{ duration: 1.2, delay: 0.6 + i * 0.12, ease: "easeOut" }}
                  className="h-full rounded-full gradient-primary"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-white/[0.07] flex items-center justify-between">
          <div className="text-[11px] text-[#7c7a8a]">Overall Score</div>
          <div className="text-lg font-bold gradient-text">72%</div>
        </div>
      </motion.div>

      {/* Floating roadmap chip */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="absolute -bottom-8 -left-8 glass-card rounded-xl p-4 w-48"
        style={{ animation: "float1 4s ease-in-out infinite" }}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <Map size={12} className="text-white" />
          </div>
          <span className="text-xs font-semibold text-white">Your Roadmap</span>
        </div>
        {["React Fundamentals", "Node & Express", "System Design"].map((step, i) => (
          <div key={step} className="flex items-center gap-2 mt-1.5">
            {i === 0 ? (
              <CheckCircle2 size={11} className="text-[#00d4ff] flex-shrink-0" />
            ) : (
              <div className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0" />
            )}
            <span className="text-[11px] text-[#7c7a8a]">{step}</span>
          </div>
        ))}
      </motion.div>

      {/* Floating stat chip */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="absolute -top-5 -right-5 glass-card rounded-xl px-4 py-3"
        style={{ animation: "float2 3.5s ease-in-out infinite" }}
      >
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} size={10} className="fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="text-[11px] font-semibold text-white mt-1">Got placed in 3 months!</p>
        <p className="text-[10px] text-[#7c7a8a]">— Priya S., SDE @ Flipkart</p>
      </motion.div>

      <style>{`
        @keyframes float1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes float2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
      `}</style>
    </div>
  );
}

/* ─── Sections ───────────────────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] rounded-full bg-[#6c63ff]/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-[#00d4ff]/8 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left — text */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 accent-chip text-xs font-semibold px-4 py-1.5 rounded-full mb-6"
          >
            <Sparkles size={12} />
            Verified Career Intelligence
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-5"
          >
            Unlock Your{" "}
            <span className="gradient-text">Career Potential</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="text-lg text-[#7c7a8a] mb-8 leading-relaxed max-w-lg"
          >
            Join the elite circle of professionals using clear skill data to redefine career
            trajectories. Get a personalised roadmap and expert-led courses in one
            platform built for India&apos;s next-gen talent.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3 }}
            className="flex flex-wrap gap-3 mb-10"
          >
            <Link href="/register" className="btn-primary inline-flex items-center gap-2 px-7 py-3.5 text-[15px]">
              Get started free <ArrowRight size={16} />
            </Link>
            <Link href="#features" className="btn-secondary inline-flex items-center gap-2 px-7 py-3.5 text-[15px]">
              <Play size={14} className="fill-current" /> See how it works
            </Link>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="flex flex-wrap gap-3"
          >
            {[
              { icon: Zap, label: "Skill Roadmaps", desc: "Data-driven career paths" },
              { icon: BookOpen, label: "Curated Learning", desc: "Industry-expert courses" },
            ].map((pill) => (
              <div
                key={pill.label}
                className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-2.5"
              >
                <div className="w-5 h-5 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                  <pill.icon size={10} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{pill.label}</p>
                  <p className="text-[10px] text-[#7c7a8a]">{pill.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right — animated dashboard mockup */}
        <div className="hidden lg:flex justify-center items-center">
          <HeroDashboard />
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="border-y border-white/[0.07] bg-[#0d0d14]/60">
      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.08} className="text-center">
              <p className="text-3xl lg:text-4xl font-bold gradient-text mb-1">{stat.value}</p>
              <p className="text-sm text-[#7c7a8a]">{stat.label}</p>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="features" className="py-28">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="accent-chip text-xs font-semibold px-4 py-1.5 rounded-full inline-block mb-4">
            HOW IT WORKS
          </span>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Master Your Career in 3 Steps
          </h2>
          <p className="text-[#7c7a8a] max-w-lg mx-auto text-lg">
            No guesswork. No wasted time. Just a clear, score-based path from where you are
            to where you want to be.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connector */}
          <div className="hidden md:block absolute top-8 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-[#6c63ff]/40 via-[#00d4ff]/40 to-[#6c63ff]/40" />

          {STEPS.map((step, i) => (
            <FadeIn key={step.number} delay={i * 0.12}>
              <div className="glass-card rounded-2xl p-7 h-full relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${step.color}12 0%, transparent 70%)` }}
                />
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 relative z-10"
                  style={{ background: `${step.color}18`, border: `1px solid ${step.color}30` }}
                >
                  <step.icon size={22} style={{ color: step.color }} />
                </div>
                <div className="text-5xl font-extrabold text-white/[0.04] absolute top-4 right-5 leading-none select-none">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 relative z-10">{step.title}</h3>
                <p className="text-sm text-[#7c7a8a] leading-relaxed relative z-10">{step.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-24 bg-[#0d0d14]/40">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <span className="accent-chip text-xs font-semibold px-4 py-1.5 rounded-full inline-block mb-4">
            PLATFORM FEATURES
          </span>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Powerful Features for Professionals
          </h2>
          <p className="text-[#7c7a8a] max-w-lg mx-auto text-lg">
            Every tool your career journey needs, intelligently connected in one platform.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 0.07}>
              <div className="glass-card rounded-2xl p-6 h-full group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                  style={{ background: `radial-gradient(circle at 30% 0%, ${feature.glow} 0%, transparent 60%)` }}
                />
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 relative z-10"
                  style={{ background: feature.glow, border: `1px solid ${feature.glow}` }}
                >
                  <feature.icon size={20} className="text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2 relative z-10">{feature.title}</h3>
                <p className="text-sm text-[#7c7a8a] leading-relaxed relative z-10">{feature.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function CoursesSection() {
  return (
    <section id="courses" className="py-28">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="flex items-end justify-between mb-12">
          <div>
            <span className="accent-chip text-xs font-semibold px-4 py-1.5 rounded-full inline-block mb-4">
              FEATURED COURSES
            </span>
            <h2 className="text-4xl font-bold text-white tracking-tight">
              Explore Career Paths
            </h2>
          </div>
          <Link
            href="/courses"
            className="hidden md:inline-flex items-center gap-1.5 text-sm text-[#6c63ff] font-medium hover:text-[#00d4ff] transition-colors"
          >
            View all courses <ChevronRight size={14} />
          </Link>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {COURSES.map((course, i) => (
            <FadeIn key={course.title} delay={i * 0.1}>
              <div className="glass-card rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                {/* Thumbnail */}
                <div className="h-44 bg-gradient-to-br from-[#141218] via-[#0d0d14] to-[#050508] relative overflow-hidden flex items-center justify-center border-b border-white/[0.07]">
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${i % 2 === 0 ? "#6c63ff" : "#00d4ff"}30 0%, transparent 70%)`,
                    }}
                  />
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative z-10">
                    <BookOpen size={28} className="text-white/40" />
                  </div>
                  <div className="absolute top-3 left-3">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${course.badgeColor}`}
                    >
                      {course.badge}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5">
                  <p className="text-[11px] text-[#6c63ff] font-semibold uppercase tracking-wider mb-2">
                    {course.category}
                  </p>
                  <h3 className="text-[15px] font-semibold text-white mb-3 leading-snug line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-xs text-[#7c7a8a] mb-3">by {course.instructor}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs font-semibold text-white">{course.rating}</span>
                      <span className="text-xs text-[#7c7a8a]">({course.students})</span>
                    </div>
                    <span className="text-sm font-bold gradient-text">{course.price}</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function TutorSection() {
  return (
    <section id="tutors" className="py-28 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#6c63ff]/6 blur-[100px] rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <FadeIn direction="left">
          <span className="accent-chip text-xs font-semibold px-4 py-1.5 rounded-full inline-block mb-6">
            FOR TUTORS
          </span>
          <h2 className="text-4xl font-bold text-white mb-5 leading-tight tracking-tight">
            Share your expertise.{" "}
            <span className="gradient-text">Earn while you teach.</span>
          </h2>
          <p className="text-[#7c7a8a] text-lg mb-10 leading-relaxed">
            Join 60+ expert tutors already teaching on CareerVue. Create your course once,
            earn every time a student enrolls — with focused course creation tools.
          </p>
          <Link
            href="/register"
            className="btn-primary inline-flex items-center gap-2 px-7 py-3.5 text-[15px]"
          >
            Become a Tutor <ArrowRight size={16} />
          </Link>
        </FadeIn>

        <FadeIn direction="right" delay={0.1}>
          <div className="space-y-3">
            {TUTOR_BENEFITS.map((benefit, i) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
                className="glass-card rounded-xl px-5 py-4 flex items-center gap-4"
              >
                <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={15} className="text-white" />
                </div>
                <span className="text-sm font-medium text-[#e6e0e9]">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24 bg-[#0d0d14]/40">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <span className="accent-chip text-xs font-semibold px-4 py-1.5 rounded-full inline-block mb-4">
            STUDENT STORIES
          </span>
          <h2 className="text-4xl font-bold text-white tracking-tight">What Our Students Say</h2>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.1}>
              <div className="glass-card rounded-2xl p-6 h-full flex flex-col">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={13} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="text-sm text-[#cbc4d2] leading-relaxed flex-1 mb-5">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.07]">
                  <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-[11px] text-[#7c7a8a]">{t.role}</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section id="pricing" className="py-28">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <FadeIn>
          <div className="glass-card rounded-3xl p-14 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#6c63ff]/10 via-transparent to-[#00d4ff]/10 pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-[#6c63ff]/60 to-transparent" />

            <span className="accent-chip text-xs font-semibold px-4 py-1.5 rounded-full inline-block mb-6">
              GET STARTED TODAY
            </span>
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
              Ready to Accelerate Your Career?
            </h2>
            <p className="text-[#7c7a8a] text-lg mb-8 max-w-xl mx-auto">
              Join thousands of students who used CareerVue to go from confused to confident —
              and placed.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="btn-primary inline-flex items-center gap-2 px-8 py-4 text-[15px]"
              >
                Get started free <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="btn-secondary inline-flex items-center gap-2 px-8 py-4 text-[15px]"
              >
                Already have an account
              </Link>
            </div>

            <p className="text-xs text-[#7c7a8a] mt-6">
              Free plan available · No credit card required
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.07] bg-[#0d0d14]/60">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center">
                <TrendingUp size={12} className="text-white" />
              </div>
              <span className="text-sm font-bold text-white">CareerVue</span>
            </div>
            <p className="text-xs text-[#7c7a8a] max-w-[180px] leading-relaxed">
              Evidence-based career development for India&apos;s next generation of tech talent.
            </p>
          </div>

          {[
            {
              label: "Product",
              links: [
                { label: "Features", href: "#features" },
                { label: "Courses", href: "/courses" },
                { label: "Pricing", href: "#pricing" },
              ],
            },
            {
              label: "For Tutors",
              links: [
                { label: "Become a Tutor", href: "/register" },
                { label: "Benefits", href: "#tutors" },
              ],
            },
            {
              label: "Account",
              links: [
                { label: "Sign in", href: "/login" },
                { label: "Register", href: "/register" },
                { label: "Privacy", href: "#" },
                { label: "Terms", href: "#" },
              ],
            },
          ].map((col) => (
            <div key={col.label}>
              <p className="text-xs font-semibold text-[#e6e0e9] mb-3">{col.label}</p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-[#7c7a8a] hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.07] pt-6 flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-[11px] text-[#7c7a8a]">
            &copy; 2024 CareerVue. Accelerating Futures.
          </p>
          <div className="flex items-center gap-4">
            {["Features", "Tutors", "Pricing", "Privacy", "Terms"].map((item) => (
              <a key={item} href="#" className="text-[11px] text-[#7c7a8a] hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="bg-[#050508]">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <CoursesSection />
      <TutorSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
