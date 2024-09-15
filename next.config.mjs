import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import withSerwistInit from "@serwist/next";
import globSync from "glob";

import withSerwistInit from "@serwist/next";

const publicScan = globSync(["**/*"], {
  nodir: true,
  cwd: "public",
  ignore: ["swe-worker-*.js", "sw.js", "sw.js.map"],
});

/**
 * @param {string} filePath
 * @returns
 */
const getFileHash = (filePath) => crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  additionalPrecacheEntries: [
    { url: "/manifest.json", revision: getFileHash("app/manifest.json") },
    ...publicScan.map((f) => ({
      // Replace "/" with your `nextConfig.basePath` if applicable.
      url: path.posix.join("/", f),
      revision: getFileHash(path.join("public", f)),
    })),
  ],
});

export default withSerwist({
  reactStrictMode: true
});