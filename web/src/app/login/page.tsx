export const dynamic = "force-dynamic";

import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/dashboard");
  const sp = await searchParams;

  return (
    <div className="flex min-h-screen bg-[#12100e] text-[#f5f0ea]">
      <div className="hidden flex-1 items-center justify-center bg-gradient-to-br from-[#211d19] via-[#1a1714] to-[#e8954a]/20 p-12 md:flex">
        <div className="max-w-md">
          <p className="text-sm uppercase tracking-[0.2em] text-[#e8954a]">Cafe Audit System</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Inventory audit & cafe operations
          </h1>
          <p className="mt-4 text-[#a89f94]">
            Link sales to recipes, reconcile physical stock, run QR table orders, and verify mobile payments.
          </p>
        </div>
      </div>
      <div className="flex w-full max-w-md flex-col justify-center px-8 py-12 md:border-l md:border-[#3d352c]">
        <h2 className="text-2xl font-semibold">Sign in</h2>
        <p className="mt-1 text-sm text-[#a89f94]">Demo: manager / admin123</p>
        {sp.error && (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            Invalid username or password.
          </p>
        )}
        <form
          className="mt-8 space-y-4"
          action={async (formData) => {
            "use server";
            try {
              await signIn("credentials", {
                username: formData.get("username"),
                password: formData.get("password"),
                redirectTo: "/dashboard",
              });
            } catch (e) {
              throw e;
            }
          }}
        >
          <div>
            <label className="mb-1 block text-sm text-[#a89f94]">Username</label>
            <input
              name="username"
              required
              className="w-full rounded-lg border border-[#3d352c] bg-[#1a1714] px-3 py-2 outline-none focus:border-[#e8954a]"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#a89f94]">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-[#3d352c] bg-[#1a1714] px-3 py-2 outline-none focus:border-[#e8954a]"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-[#e8954a] px-3 py-2.5 font-medium text-[#12100e] hover:brightness-110"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
