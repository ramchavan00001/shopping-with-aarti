import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="container-page grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="font-display text-7xl font-semibold text-accent">404</p>
        <h1 className="mt-3 font-display text-2xl font-semibold">This page went out of stock</h1>
        <p className="mt-2 text-muted">Let's get you back to the good stuff.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-ink">
          Back to home
        </Link>
      </div>
    </div>
  );
}
