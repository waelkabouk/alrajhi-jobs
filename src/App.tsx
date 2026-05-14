import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AuthPage from "./pages/Auth";
import PublicJobs from "./pages/PublicJobs";
import JobDetails from "./pages/JobDetails";
import HrJobs from "./pages/hr/HrJobs";
import HrJobForm from "./pages/hr/HrJobForm";
import HrApplications from "./pages/hr/HrApplications";
import HrUsers from "./pages/admin/HrUsers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<PublicJobs />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/jobs" element={<Navigate to="/" replace />} />
            <Route path="/jobs/:jobId" element={<JobDetails />} />

            <Route path="/admin" element={<Navigate to="/admin/hr" replace />} />
            <Route path="/admin/hr" element={<ProtectedRoute requireRole="super_admin"><HrUsers /></ProtectedRoute>} />

            <Route path="/hr" element={<ProtectedRoute requireRole="hr"><HrJobs /></ProtectedRoute>} />
            <Route path="/hr/jobs/new" element={<ProtectedRoute requireRole="hr"><HrJobForm /></ProtectedRoute>} />
            <Route path="/hr/jobs/:id" element={<ProtectedRoute requireRole="hr"><HrJobForm /></ProtectedRoute>} />
            <Route path="/hr/jobs/:id/applications" element={<ProtectedRoute requireRole="hr"><HrApplications /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
