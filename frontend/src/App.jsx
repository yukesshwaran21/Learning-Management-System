// App.jsx
// Root application component with React Router v6 configuration.
// Defines all routes including protected role-based routes.

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Suspense, lazy } from "react";

import Navbar         from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

// Eagerly loaded pages (critical path)
import HomePage     from "./pages/HomePage";
import LoginPage    from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// Lazily loaded pages (code-splitting)
const CoursesPage       = lazy(() => import("./pages/CoursesPage"));
const StudentDashboard  = lazy(() => import("./pages/StudentDashboard"));

// Loading fallback component
const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-12 h-12 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-surface-900">
        <Navbar />

        <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/"         element={<HomePage />} />
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/courses"  element={<CoursesPage />} />

            {/* Student Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
            </Route>

            {/* Instructor Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={["instructor", "admin"]} />}>
              <Route path="/instructor/dashboard" element={
                <div className="pt-24 text-center text-white">Instructor Dashboard (Coming Soon)</div>
              } />
            </Route>

            {/* Admin Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin/dashboard" element={
                <div className="pt-24 text-center text-white">Admin Dashboard (Coming Soon)</div>
              } />
            </Route>

            {/* Fallback */}
            <Route path="/unauthorized" element={
              <div className="pt-24 text-center">
                <h1 className="text-4xl font-bold text-white">403</h1>
                <p className="text-gray-400 mt-2">You don't have access to this page.</p>
              </div>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        {/* Global Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#18181f",
              color:       "#fff",
              border:      "1px solid #2e2e3a",
              borderRadius: "12px",
              fontSize:    "14px",
            },
            success: { iconTheme: { primary: "#6366f1", secondary: "#fff" } },
            error:   { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
            duration: 4000,
          }}
        />
      </div>
    </BrowserRouter>
  );
}
