import { useEffect } from "react";

export type SeoMetadata = {
  title: string;
  description: string;
  robots?: string;
  canonicalPath?: string;
  structuredData?: Record<string, unknown>;
};

function setMeta(
  selector: string,
  attribute: "name" | "property",
  value: string,
) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, selector.match(/["'](.+)["']/)?.[1] || "");
    document.head.appendChild(element);
  }

  element.content = value;
}

export function Seo({
  title,
  description,
  robots = "index, follow",
  canonicalPath,
  structuredData,
}: SeoMetadata) {
  useEffect(() => {
    const canonicalUrl = new URL(
      canonicalPath ?? window.location.pathname,
      window.location.origin,
    ).toString();

    document.title = title;
    setMeta('meta[name="description"]', "name", description);
    setMeta('meta[name="robots"]', "name", robots);
    setMeta('meta[property="og:title"]', "property", title);
    setMeta('meta[property="og:description"]', "property", description);
    setMeta('meta[property="og:type"]', "property", "website");
    setMeta('meta[property="og:url"]', "property", canonicalUrl);
    setMeta('meta[name="twitter:card"]', "name", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", title);
    setMeta('meta[name="twitter:description"]', "name", description);

    let canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    if (!structuredData) return;

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      ...structuredData,
      url: structuredData.url ?? canonicalUrl,
    });
    document.head.appendChild(script);

    return () => script.remove();
  }, [canonicalPath, description, robots, structuredData, title]);

  return null;
}
