import { ArrowLeft, SearchX } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-inner">
        <SearchX size={30} />
        <p className="eyebrow">Page not found</p>
        <h1>That reference is not here.</h1>
        <p>Check the address, or return to the directory and begin again.</p>
        <Link
          href="/"
          className="btn btn-primary"
          data-testid="link-not-found-home"
        >
          <ArrowLeft size={16} /> Back to home
        </Link>
      </div>
    </div>
  );
}
