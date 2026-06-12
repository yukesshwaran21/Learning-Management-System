// Page: RegisterPage.jsx
// User registration form with role selection.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AcademicCapIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import useAuthStore from "../store/authStore";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "student",
  });
  const [showPass, setShowPass] = useState(false);
  const { register, isLoading } = useAuthStore();
  const navigate                = useNavigate();

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await register(form);
    if (success) {
      const dashPaths = {
        student:    "/student/dashboard",
        instructor: "/instructor/dashboard",
        admin:      "/admin/dashboard",
      };
      navigate(dashPaths[form.role] || "/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-accent-600/15 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center mx-auto mb-4 shadow-glow-brand">
            <AcademicCapIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Create your account</h1>
          <p className="text-gray-400 mt-1">Join 50,000+ learners today — free</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                id="reg-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  className="input-field pr-12"
                  placeholder="Min 8 chars, uppercase & number"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  aria-label="Toggle password"
                >
                  {showPass ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                I want to…
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "student",    label: "📚 Learn",  desc: "Take courses" },
                  { value: "instructor", label: "🎓 Teach",  desc: "Create courses" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all ${
                      form.role === option.value
                        ? "border-brand-500 bg-brand-900/30 text-white"
                        : "border-surface-500 bg-surface-700 text-gray-400 hover:border-brand-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={form.role === option.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-2xl mb-1">{option.label.split(" ")[0]}</span>
                    <span className="text-sm font-medium">{option.label.split(" ")[1]}</span>
                    <span className="text-xs text-gray-500 mt-0.5">{option.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              id="btn-register"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating account…
                </span>
              ) : (
                "Create Account"
              )}
            </button>

            <p className="text-xs text-gray-600 text-center">
              By registering you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
