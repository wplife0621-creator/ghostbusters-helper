const baseUrl = process.argv[2] || "https://busters.kr";
const debugPort = process.argv[3] || "9222";
const pages = [
  { name: "home", path: "/", checks: [".home-fan-notice", ".home-popular-item"] },
  { name: "essences", path: "/essences", checks: ["#results", ".essence-table tbody tr"] },
  { name: "numbers", path: "/numbers", checks: ["#numbersResults", ".number-card"] },
  { name: "builds", path: "/builds", checks: ["#buildList", ".build-public-card"] },
  { name: "guides", path: "/guides", checks: ["#guidePosts", ".guide-row"] },
  { name: "admin", path: "/admin", checks: [".admin-tabs", "#pendingReports"] },
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createTarget(url) {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!response.ok) throw new Error(`Cannot create Chrome target: ${response.status}`);
  return response.json();
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.events = [];
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result || {});
        return;
      }
      if (message.method) this.events.push(message);
    });
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

const auditExpression = (selectors) => `(() => {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const all = [...document.querySelectorAll('body *')];
  const hasScrollableAncestor = (element) => {
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const style = getComputedStyle(parent);
      if (/(auto|scroll)/.test(style.overflowX) && parent.scrollWidth > parent.clientWidth + 2) return true;
      parent = parent.parentElement;
    }
    return false;
  };
  const overflowing = all.map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      element,
      rect,
      style: getComputedStyle(element),
      intentional: hasScrollableAncestor(element),
    };
  }).filter(({ rect, style, intentional }) =>
    !intentional && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 &&
    (rect.right > viewportWidth + 2 || rect.left < -2 || rect.width > viewportWidth + 2)
  ).slice(0, 20).map(({ element, rect }) => ({
    tag: element.tagName.toLowerCase(),
    id: element.id || '',
    className: String(element.className || '').slice(0, 160),
    left: Math.round(rect.left),
    right: Math.round(rect.right),
    width: Math.round(rect.width),
    text: String(element.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 100),
  }));
  const clipped = all.filter((element) => {
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 3 &&
      !/(auto|scroll)/.test(style.overflowX) && !hasScrollableAncestor(element);
  }).slice(0, 20).map((element) => ({
    tag: element.tagName.toLowerCase(),
    id: element.id || '',
    className: String(element.className || '').slice(0, 160),
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    text: String(element.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 100),
  }));
  return {
    title: document.title,
    viewport: { width: viewportWidth, height: viewportHeight },
    document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    checks: Object.fromEntries(${JSON.stringify(selectors)}.map((selector) => [selector, document.querySelectorAll(selector).length])),
    overflowing,
    clipped,
  };
})()`;

async function auditPage(page) {
  const target = await createTarget(`${baseUrl}${page.path}?qa-browser=${Date.now()}`);
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Log.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await client.send("Page.navigate", { url: `${baseUrl}${page.path}?qa-browser=${Date.now()}` });
  await delay(7000);
  const result = await client.send("Runtime.evaluate", {
    expression: auditExpression(page.checks),
    returnByValue: true,
  });
  const errors = client.events.filter((event) =>
    event.method === "Runtime.exceptionThrown" ||
    (event.method === "Log.entryAdded" && ["error", "warning"].includes(event.params?.entry?.level))
  ).map((event) => ({
    message: event.params?.exceptionDetails?.text || event.params?.entry?.text || event.method,
    url: event.params?.entry?.url || "",
    source: event.params?.entry?.source || event.method,
  }));
  client.close();
  await fetch(`http://127.0.0.1:${debugPort}/json/close/${target.id}`).catch(() => {});
  return { page: page.name, ...result.result.value, errors };
}

const results = [];
for (const page of pages) {
  try {
    results.push(await auditPage(page));
  } catch (error) {
    results.push({ page: page.name, fatal: error.message });
  }
}
console.log(JSON.stringify(results, null, 2));
