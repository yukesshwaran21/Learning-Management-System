// Page: CoursesPage.jsx
// Browsable course catalogue with search and filter controls.

import { useState, useEffect, useCallback } from "react";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";
import CourseCard from "../components/CourseCard";
import api from "../services/api";

const LEVELS    = ["", "beginner", "intermediate", "advanced"];
const PAGE_SIZE = 12;

export default function CoursesPage() {
  const [courses,   setCourses]   = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search,    setSearch]    = useState("");
  const [level,     setLevel]     = useState("");
  const [inputVal,  setInputVal]  = useState("");

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page, limit: PAGE_SIZE, status: "published",
        ...(search && { search }),
        ...(level  && { level }),
      });
      const { data } = await api.get(`/courses?${params}`);
      setCourses(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, level]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(inputVal);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [inputVal]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-display text-4xl font-bold text-white mb-2">
            Browse Courses
          </h1>
          <p className="text-gray-400">
            {total.toLocaleString()} courses available — find the perfect match for your goals.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              id="course-search"
              placeholder="Search courses…"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="input-field pl-11"
            />
          </div>

          {/* Level filter */}
          <div className="relative">
            <FunnelIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select
              value={level}
              onChange={(e) => { setLevel(e.target.value); setPage(1); }}
              id="level-filter"
              className="input-field pl-10 pr-8 appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="">All Levels</option>
              {LEVELS.filter(Boolean).map((l) => (
                <option key={l} value={l}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Course Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card h-72 animate-pulse">
                <div className="aspect-video bg-surface-700 rounded-t-2xl" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-surface-600 rounded w-1/3" />
                  <div className="h-4 bg-surface-600 rounded w-4/5" />
                  <div className="h-3 bg-surface-600 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-24">
            <MagnifyingGlassIcon className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No courses found</h3>
            <p className="text-gray-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course, i) => (
              <CourseCard key={course.id} course={course} index={i} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-12">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-gray-400 text-sm px-4">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
