import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <div className="not-found-code" aria-hidden="true">404</div>
      <h2>Page not found</h2>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <Link href="/" className="btn">Back to Home</Link>
    </main>
  );
}
