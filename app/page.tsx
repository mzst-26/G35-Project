import AdminLogin from "./components/admin/admin_login";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main>
        <h1>Welcome to TradeFair. This is a test.</h1>

        <AdminLogin/>
      </main>
    </div>
  );
}
