import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Page not found · பக்கம் இல்லை</h1>
      <p className="mt-3 text-navy-700">The page you were looking for doesn&apos;t exist.</p>
      <Link href="/" className="btn-primary mt-6">Go home · முகப்பு</Link>
    </div>
  );
}
