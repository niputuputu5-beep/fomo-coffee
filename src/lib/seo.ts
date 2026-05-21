type SeoOptions = {
  title: string;
  description: string;
  path?: string;
  image?: string;
};

function setMeta(name: string, content: string, attribute = "name") {
  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${name}"]`,
  );

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }

  tag.content = content;
}

export function setSeo({ title, description, path = "/", image = "/logo.png" }: SeoOptions) {
  const url = `${window.location.origin}${path}`;

  document.title = title;
  setMeta("description", description);
  setMeta("robots", "index, follow");
  setMeta("og:title", title, "property");
  setMeta("og:description", description, "property");
  setMeta("og:type", "website", "property");
  setMeta("og:url", url, "property");
  setMeta("og:image", `${window.location.origin}${image}`, "property");
  setMeta("twitter:card", "summary_large_image");
  setMeta("twitter:title", title);
  setMeta("twitter:description", description);

  let canonical = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}
