// Component: Navbar.jsx
// Top navigation with role-aware links and mobile responsive menu.

import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AcademicCapIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import useAuthStore from "../store/authStore";
import clsx from "clsx";

const navLinks = [
  { label: "Courses",    to: "/courses" },
  { label: "About",      to: "/about" },
];

export default function Navbar() {
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const dashboardPath =
    user?.role === "admin"      ? "/admin/dashboard"
    : user?.role === "instructor" ? "/instructor/dashboard"
    : "/student/dashboard";

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-surface-700/50 backdrop-blur-xl bg-surface-900/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center shadow-glow-sm group-hover:shadow-glow-brand transition-shadow">
              <AcademicCapIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl gradient-text">
              LearnSphere
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  clsx(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-900/50 text-brand-300"
                      : "text-gray-400 hover:text-white hover:bg-surface-700"
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Desktop Auth Area */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated() ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((p) => !p)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-700 hover:bg-surface-600 transition-colors"
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="w-7 h-7 text-brand-400" />
                  )}
                  <span className="text-sm font-medium text-white">{user?.name}</span>
                  <ChevronDownIcon
                    className={clsx(
                      "w-4 h-4 text-gray-400 transition-transform",
                      profileOpen && "rotate-180"
                    )}
                  />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-52 card-glass py-1 shadow-card-dark z-50"
                      onMouseLeave={() => setProfileOpen(false)}
                    >
                      <Link
                        to={dashboardPath}
                        className="flex items-center px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-surface-700 transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-surface-700 transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        My Profile
                      </Link>
                      <hr className="my-1 border-surface-600" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-surface-700 transition-colors"
                      >
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary text-sm py-2">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-surface-700 transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden border-t border-surface-700 bg-surface-800 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className="block px-4 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-surface-700 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
              <hr className="border-surface-600 my-2" />
              {isAuthenticated() ? (
                <>
                  <Link
                    to={dashboardPath}
                    className="block px-4 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-surface-700 transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileOpen(false); }}
                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-red-400"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-2">
                  <Link to="/login"    className="btn-secondary text-sm" onClick={() => setMobileOpen(false)}>Sign In</Link>
                  <Link to="/register" className="btn-primary  text-sm" onClick={() => setMobileOpen(false)}>Get Started</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
