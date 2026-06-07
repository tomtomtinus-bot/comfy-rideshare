import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const BASE_URL = "https://viacust.com";

interface SeoHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  jsonLd?: Record<string, unknown>[];
}

const DEFAULT_OG_IMAGE = "/og-image-v4.jpg";

const toAbsolute = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

/**
 * Per-page SEO head. Renders title, description and a self-referencing canonical link.
 * If `canonical` is omitted, it is derived from the current pathname so any future
 * route automatically gets the correct self-referencing URL.
 */
export const SeoHead = ({ title, description, canonical, image, jsonLd }: SeoHeadProps) => {
  const location = useLocation();
  const url = canonical ?? `${BASE_URL}${location.pathname}`;
  const imageUrl = toAbsolute(image ?? DEFAULT_OG_IMAGE);

  return (
    <Helmet>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta property="og:url" content={url} />
      {title && <meta property="og:title" content={title} />}
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      {description && <meta name="twitter:description" content={description} />}
      <meta property="og:image" content={imageUrl} />
      <meta name="twitter:image" content={imageUrl} />
      {jsonLd?.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SeoHead;
