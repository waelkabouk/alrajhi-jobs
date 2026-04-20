import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import AuthPage from "./pages/Auth";
import CompanyPublic from "./pages/CompanyPublic";
import JobDetails from "./pages/JobDetails";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminCompanyDetails from "./pages/admin/AdminCompanyDetails";
import HrJobs from "./pages/hr/HrJobs";
import HrJobForm from "./pages/hr/HrJobForm";
import HrApplications from "./pages/hr/HrApplications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/company/:slug" element={<CompanyPublic />} />
            <Route path="/company/:slug/jobs/:jobId" element={<JobDetails />} />

            <Route path="/admin/companies" element={<ProtectedRoute requireRole="super_admin"><AdminCompanies /></ProtectedRoute>} />
            <Route path="/admin/companies/:id" element={<ProtectedRoute requireRole="super_admin"><AdminCompanyDetails /></ProtectedRoute>} />

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
