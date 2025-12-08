"use client";


import LoginScreen from "@/components/login/login";
import { Route, Routes } from "react-router-dom";

export default function Home() {

  const handleLogin = (_role: 'company' | 'trade') => {
    // Later on Authentication would be handled here in production
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black w-full">
      <main className="w-full">
        <Routes>
          <Route path="/" element={<LoginScreen onLogin={handleLogin} />} />
          {/* <Route path="/admin/adminLogin" element={<AdminLogin />} />
          <Route path="/admin/companyReg" element={<CompanyReg />} />
          <Route path="/admin/WorkerReg" element={<WorkerReg />} /> */}
        </Routes>
      </main>
    </div>
  );
}
