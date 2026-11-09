import assert from "node:assert/strict";

const sourcePath = (path) => {
  if (path === "/vi" || path === "/vi/") return "/en";
  if (path.startsWith("/vi/_sites/")) return `/${path.slice("/vi/_sites/".length)}`;
  if (path.startsWith("/vi/")) return `/en/${path.slice(4)}`;
  return path;
};

const vietnamesePath = (path) => {
  if (path === "/en" || path === "/en/") return "/vi";
  if (path.startsWith("/en/")) return `/vi/${path.slice(4)}`;
  return `/vi/_sites${path.startsWith("/") ? path : `/${path}`}`;
};

assert.equal(sourcePath("/vi"), "/en");
assert.equal(sourcePath("/vi/about-us"), "/en/about-us");
assert.equal(sourcePath("/vi/_sites/sg/en"), "/sg/en");
assert.equal(vietnamesePath("/en/about-us"), "/vi/about-us");
assert.equal(vietnamesePath("/securitycouncil"), "/vi/_sites/securitycouncil");
console.log("UN proxy route mapping checks passed.");
