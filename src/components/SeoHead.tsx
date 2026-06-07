import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const BASE_URL = "https://viacust.com";

interface SeoHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  jsonLd?: Record<string, unknown>[];
}

/**
 * Per-page SEO head. Renders title, description and a self-referencing canonical link.
 * If `canonical` is omitted, it is derived from the current pathname so any future
 * route automatically gets the correct self-referencing URL.
 */
export const SeoHead = ({ title, description, canonical, jsonLd }: SeoHeadProps) => {
  const location = useLocation();
  const url = canonical ?? `${BASE_URL}${location.pathname}`;

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
      {jsonLd?.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SeoHead;
