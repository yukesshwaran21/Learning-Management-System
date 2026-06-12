// Component: CourseCard.jsx
// Reusable card for displaying a course in listings and search results.

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  StarIcon,
  ClockIcon,
  UsersIcon,
  BookOpenIcon,
} from "@heroicons/react/24/solid";
import clsx from "clsx";

/**
 * formatDuration
 * Converts total seconds to a human-readable duration string.
 * @param {number} seconds
 * @returns {string}  e.g. "4h 30m" or "45m"
 */
const formatDuration = (seconds) => {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const levelColors = {
  beginner:     "badge-green",
  intermediate: "badge-yellow",
  advanced:     "badge-red",
};

export default function CourseCard({ course, index = 0 }) {
  if (!course) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link to={`/courses/${course.slug}`} className="group block h-full">
        <div className="card h-full flex flex-col overflow-hidden">
          {/* Thumbnail */}
          <div className="relative overflow-hidden aspect-video bg-surface-700">
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-hero-gradient">
                <BookOpenIcon className="w-16 h-16 text-brand-400/40" />
              </div>
            )}

            {/* Level badge overlay */}
            <div className="absolute top-3 left-3">
              <span className={clsx("badge", levelColors[course.level] || "badge-brand")}>
                {course.level}
              </span>
            </div>

            {/* Price badge */}
            <div className="absolute top-3 right-3">
              <span className="px-2.5 py-1 rounded-lg bg-surface-900/80 backdrop-blur-sm text-sm font-bold text-white">
                {parseFloat(course.price) === 0 ? "Free" : `$${parseFloat(course.price).toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 flex flex-col flex-1">
            {/* Category */}
            {course.category_name && (
              <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">
                {course.category_name}
              </p>
            )}

            {/* Title */}
            <h3 className="font-display font-semibold text-white text-base leading-snug mb-3 line-clamp-2 group-hover:text-brand-300 transition-colors">
              {course.title}
            </h3>

            {/* Instructor */}
            <p className="text-sm text-gray-500 mb-4">
              by{" "}
              <span className="text-gray-300 font-medium">
                {course.instructor_name}
              </span>
            </p>

            {/* Rating */}
            <div className="flex items-center gap-1.5 mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon
                    key={star}
                    className={clsx(
                      "w-4 h-4",
                      star <= Math.round(parseFloat(course.rating_avg))
                        ? "text-yellow-400"
                        : "text-surface-500"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-yellow-400">
                {parseFloat(course.rating_avg).toFixed(1)}
              </span>
              <span className="text-xs text-gray-500">
                ({course.rating_count?.toLocaleString()})
              </span>
            </div>

            {/* Footer Stats */}
            <div className="mt-auto pt-3 border-t border-surface-600 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5" />
                {formatDuration(course.total_duration)}
              </span>
              <span className="flex items-center gap-1">
                <UsersIcon className="w-3.5 h-3.5" />
                {course.enrolled_count?.toLocaleString()} students
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
