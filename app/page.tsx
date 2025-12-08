"use client";


import LoginScreen from "@/app/login/login";
import RegisterRecruiter from "@/app/login/register/recruiter/page";

export default function Home() {

  const handleLogin = (_role: 'company' | 'trade') => {
    // Later on Authentication would be handled here in production
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black w-full">
      <main className="w-full">
        <LoginScreen onLogin={handleLogin}/>
      </main>
    </div>
  );
}
