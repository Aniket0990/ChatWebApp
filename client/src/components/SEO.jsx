import { useEffect } from "react";

const BASE_URL = "https://connectnchat.vercel.app";

/**
 * SEO component that sets document head tags dynamically.
 * Updates title, description, canonical link, Open Graph, and Twitter metadata per route.
 */
export default function SEO({
  title = "Connecto — Fast & Secure Real-Time Web Chat App",
  description = "Connecto is a modern, blazing-fast real-time chat application. Connect with friends, send instant messages, share media, and chat securely with fluid responsiveness.",
  keywords = "realtime chat, instant messaging, connecto chat, secure messaging web app, connect with friends, online chat, socket.io chat",
  canonical = "",
  robots = "index, follow",
  ogType = "website",
  ogImage = `${BASE_URL}/wallpapers/wallpaper-2.jpg`,
}) {
  const fullCanonical = canonical
    ? canonical.startsWith("http")
      ? canonical
      : `${BASE_URL}${canonical}`
    : BASE_URL;

  useEffect(() => {
    // 1. Update Title
    document.title = title;

    // 2. Helper to set or create meta tag
    const setMeta = (name, content, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Description & Keywords
    setMeta("description", description);
    setMeta("keywords", keywords);
    setMeta("robots", robots);

    // Open Graph
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", fullCanonical, true);
    setMeta("og:type", ogType, true);
    setMeta("og:image", ogImage, true);

    // Twitter
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImage);

    // Canonical link
    let canonicalLink = document.querySelector("link[rel='canonical']");
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", fullCanonical);
  }, [title, description, keywords, fullCanonical, robots, ogType, ogImage]);

  return null;
}
