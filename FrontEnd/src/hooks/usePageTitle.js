import { useEffect } from 'react';

const SITE_NAME = 'ET-Cafe';

// Sets document.title for the active route (helps SEO for Google's
// JS-rendering pass and gives shared/bookmarked tabs a meaningful title,
// since this SPA has no server-side rendering to set it per-request).
export function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
