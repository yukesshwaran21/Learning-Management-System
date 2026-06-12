// Page: HomePage.jsx
// Marketing landing page for the LMS.

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AcademicCapIcon,
  PlayCircleIcon,
  ShieldCheckIcon,
  BoltIcon,
  TrophyIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";

const stats = [
  { label: "Active Students",  value: "50,000+" },
  { label: "Expert Courses",   value: "1,200+" },
  { label: "Instructors",      value: "300+" },
  { label: "Completion Rate",  value: "94%" },
];

const features = [
  {
    icon: PlayCircleIcon,
    title: "HD Video Lessons",
    desc: "Stream high-quality video content from anywhere, on any device.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Verified Instructors",
    desc: "Learn from industry professionals vetted by our expert team.",
  },
  {
    icon: BoltIcon,
    title: "Learn at Your Pace",
    desc: "Lifetime access to course content — learn whenever suits you.",
  },
  {
    icon: TrophyIcon,
    title: "Earn Certificates",
    desc: "Showcase your new skills with verifiable completion certificates.",
  },
];

const testimonials = [
  {
    name:   "Sarah Chen",
    role:   "Frontend Developer",
    avatar: null,
    rating: 5,
    text:   "LearnSphere completely transformed my career. The React course was incredibly well-structured and the video quality is top-notch.",
  },
  {
    name:   "Marcus Williams",
    role:   "Data Scientist",
    avatar: null,
    rating: 5,
    text:   "The Python & ML track gave me everything I needed to land my dream job. Worth every penny.",
  },
  {
    name:   "Priya Patel",
    role:   "Product Designer",
    avatar: null,
    rating: 5,
    text:   "I love how I can track my progress and revisit lessons anytime. The UX/Figma course is exceptional.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* ── Hero Section ─────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-32">
        {/* Background glow blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-700/20 blur-3xl" />
          <div className="absolute top-16 right-0 w-80 h-80 rounded-full bg-accent-600/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-brand-600/10 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-900/60 border border-brand-700 text-brand-300 text-sm font-medium mb-6">
              <BoltIcon className="w-4 h-4" />
              The Future of Online Learning
            </span>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
              Master{" "}
              <span className="gradient-text">In-Demand Skills</span>
              <br />
              with Expert Guidance
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Join 50,000+ learners building real-world skills through structured
              video courses, hands-on projects, and a global community.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/courses" className="btn-primary text-base px-8 py-3 shadow-glow-brand">
                <PlayCircleIcon className="w-5 h-5" />
                Explore Courses
              </Link>
              <Link to="/register" className="btn-secondary text-base px-8 py-3">
                Start for Free
              </Link>
            </div>
          </motion.div>

          {/* Floating Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="card-glass p-5 text-center">
                <p className="font-display text-3xl font-bold gradient-text">{stat.value}</p>
                <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────── */}
      <section className="py-24 bg-surface-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title mb-4">Why LearnSphere?</h2>
            <p className="section-subtitle max-w-xl mx-auto">
              Everything you need to go from beginner to professional, in one platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="card p-6 text-center group"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center mx-auto mb-4 shadow-glow-sm group-hover:shadow-glow-brand transition-shadow">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials Section ─────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title mb-4">Loved by Learners</h2>
            <p className="section-subtitle">Real stories from people who transformed their careers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="card p-6"
              >
                <div className="flex mb-3">
                  {[...Array(t.rating)].map((_, j) => (
                    <StarIcon key={j} className="w-4 h-4 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center font-bold text-white text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────── */}
      <section className="py-20 bg-hero-gradient">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <AcademicCapIcon className="w-16 h-16 text-brand-300 mx-auto mb-6" />
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
              Ready to Level Up?
            </h2>
            <p className="text-xl text-brand-200 mb-8">
              Join thousands of learners and start your first course today — free.
            </p>
            <Link to="/register" className="btn-secondary bg-white text-brand-700 hover:bg-gray-50 text-base px-10 py-3 font-bold">
              <UsersIcon className="w-5 h-5" />
              Create Free Account
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
