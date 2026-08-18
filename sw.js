const V = "acc-v2";
const SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
  "./icons/maskable-512.png",
  "./icons/favicon.ico",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

const put = (req, res) => {
  const copy = res.clone();
  caches.open(V).then((c) => c.put(req, copy)).catch(() => {});
  return res;
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // หน้าเว็บ: เอาของใหม่ก่อน ถ้าเน็ตล่มค่อยใช้ของเก่า
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => put(req, res))
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // ตัวแอป: ใช้ของเก่าก่อนให้เปิดไว แล้วดึงของใหม่มาเก็บไว้เงียบ ๆ
  if (url.origin === location.origin && url.pathname.endsWith("app.js")) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => put(req, res)).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // ที่เหลือ (ไอคอน ฟอนต์): ใช้ของเก่าก่อนเสมอ
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => put(req, res))
          .catch(() => hit)
    )
  );
});
