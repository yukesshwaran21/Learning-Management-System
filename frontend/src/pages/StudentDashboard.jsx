// Page: StudentDashboard.jsx
// Dashboard for enrolled students — shows enrolled courses with progress bars.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpenIcon,
  TrophyIcon,
  ClockIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import useAuthStore from "../store/authStore";
import api from "../services/api";

function ProgressBar({ value }) {
  return (
    <div className="w-full bg-surface-600 rounded-full h-2 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="h-full bg-brand-gradient rounded-full"
      />
    </div>
  );
}

export default function StudentDashboard() {
  const { user }                      = useAuthStore();
  const [enrollments, setEnrollments] = useState([]);
  const [isLoading,   setIsLoading]   = useState(true);

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const { data } = await api.get("/enrollments/my");
        setEnrollments(data.data || []);
      } catch (err) {
        console.error("Failed to fetch enrollments:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEnrollments();
  }, []);

  const completed  = enrollments.filter((e) => e.status === "completed").length;
  const inProgress = enrollments.filter((e) => e.status === "active" && e.progress > 0).length;

  const statCards = [
    { label: "Enrolled Courses",  value: enrollments.length, icon: BookOpenIcon,  color: "text-brand-400" },
    { label: "In Progress",       value: inProgress,          icon: FireIcon,      color: "text-orange-400" },
    { label: "Completed",         value: completed,           icon: TrophyIcon,    color: "text-yellow-400" },
    { label: "Hours Learned",     value: "—",                 icon: ClockIcon,     color: "text-green-400" },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold text-white">
            Welcome back, <span className="gradient-text">{user?.name?.split(" ")[0]}</span> 👋
          </h1>
          <p className="text-gray-400 mt-1">Keep the momentum going — you're doing great.</p>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="card p-5"
            >
              <stat.icon className={`w-6 h-6 ${stat.color} mb-3`} />
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Enrolled Courses */}
        <h2 className="font-display text-xl font-semibold text-white mb-4">
          My Courses
        </h2>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-32 h-20 bg-surface-700 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-surface-700 rounded w-3/4" />
                    <div className="h-3 bg-surface-700 rounded w-1/2" />
                    <div className="h-2 bg-surface-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="card p-12 text-center">
            <BookOpenIcon className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No enrollments yet</h3>
            <p className="text-gray-500 mb-6">Start learning today with a free course.</p>
            <Link to="/courses" className="btn-primary">
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment, i) => (
              <motion.div
                key={enrollment.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="card p-5 flex flex-col sm:flex-row gap-4"
              >
                {/* Thumbnail */}
                <div className="w-full sm:w-36 h-24 rounded-xl overflow-hidden bg-surface-700 flex-shrink-0">
                  {enrollment.thumbnail_url ? (
                    <img
                      src={enrollment.thumbnail_url}
                      alt={enrollment.course_title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-hero-gradient flex items-center justify-center">
                      <BookOpenIcon className="w-8 h-8 text-brand-400/50" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">
                      {enrollment.course_title}
                    </h3>
                    <span className={`badge flex-shrink-0 ${
                      enrollment.status === "completed" ? "badge-green" : "badge-brand"
                    }`}>
                      {enrollment.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mb-3">
                    by {enrollment.instructor_name}
                  </p>

                  <div className="flex items-center gap-3">
                    <ProgressBar value={parseFloat(enrollment.progress)} />
                    <span className="text-sm font-semibold text-brand-400 flex-shrink-0">
                      {parseFloat(enrollment.progress).toFixed(0)}%
                    </span>
                  </div>

                  <Link
                    to={`/courses/${enrollment.course_slug}`}
                    className="inline-block mt-3 text-sm text-brand-400 hover:text-brand-300 font-medium transition-colors"
                  >
                    {enrollment.status === "completed" ? "Review course →" : "Continue learning →"}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
