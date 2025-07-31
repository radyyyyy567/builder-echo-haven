import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Users from "./pages/Users";
import Groups from "./pages/Groups";
import Events from "./pages/Events";
import Surveys from "./pages/Surveys";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./components/AdminLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route 
            path="/users" 
            element={
              <AdminLayout>
                <Users />
              </AdminLayout>
            } 
          />
          <Route 
            path="/groups" 
            element={
              <AdminLayout>
                <Groups />
              </AdminLayout>
            } 
          />
          <Route 
            path="/events" 
            element={
              <AdminLayout>
                <Events />
              </AdminLayout>
            } 
          />
          <Route 
            path="/surveys" 
            element={
              <AdminLayout>
                <Surveys />
              </AdminLayout>
            } 
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
