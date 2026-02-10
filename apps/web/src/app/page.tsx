import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">ContentHQ</h1>
      <p className="text-lg text-gray-600">Content management platform</p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-black px-6 py-2 text-white hover:bg-gray-800"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-gray-300 px-6 py-2 hover:bg-gray-50"
        >
          Register
        </Link>
      </div>
    </main>
  );
}
