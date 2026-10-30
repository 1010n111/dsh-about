/**
 * dsh-about — Host 半区
 *
 * 标准 DSH Web 插件(Host 侧):在组合中以 `name: 'dsh-about'` 行挂载,
 * 向浏览器提供只读 HTTP 端点:
 *   GET /dsh-about/version   — 当前运行的 dsh 版本
 *   GET /dsh-about/releases  — deepseek-harness 更新日志(GitHub Releases 代理,
 *                              解决浏览器直连 GitHub 不稳/跨域的问题)
 *
 * 版本来源:通过 `clientModules.clientPath()` 取到任一 Web 插件 bundle 的
 * 绝对路径,遍历其中出现的每一层 `node_modules` 生成候选,反推 dsh 安装根
 * 目录,再经 `fs` 服务读取 `@deepseek-ai/dsh/package.json` 的 `version`
 * 字段(与 `dsh --version` 输出一致),并用 `name` 字段校验。
 */

/** 插件自身版本,与 package.json 的 version 字段保持一致。 */
const PLUGIN_VERSION = "0.0.5";

const normalize = (p) => String(p).replace(/\\/g, "/");

/**
 * 解析正在运行的 dsh 版本;失败返回 undefined。
 * @param ctx - Host cordis 上下文。
 */
async function readDshVersion(ctx) {
  const clientModules = ctx.get("clientModules");
  const fs = ctx.get("fs");
  if (clientModules === undefined || fs === undefined) return undefined;
  const anchors = [
    "@deepseek-ai/dsh-client-modules",
    "@deepseek-ai/dsh-client-runtime",
    "@deepseek-ai/dsh-client-connection",
    "@deepseek-ai/dsh-client-ui-theme",
  ];
  for (const anchor of anchors) {
    const bundle = clientModules.clientPath(anchor);
    if (typeof bundle !== "string" || bundle.length === 0) continue;
    const path = normalize(bundle);
    const candidates = [];
    let from = 0;
    for (;;) {
      const marker = path.indexOf("node_modules", from);
      if (marker < 0) break;
      candidates.push(`${path.slice(0, marker)}node_modules/@deepseek-ai/dsh/package.json`);
      from = marker + 1;
    }
    const tail = path.lastIndexOf("node_modules");
    if (tail >= 0) {
      candidates.push(`${path.slice(0, tail)}@deepseek-ai/dsh/package.json`);
    }
    for (const candidate of candidates) {
      try {
        const target = await fs.resolve(candidate);
        const text = await fs.readText(target);
        const manifest = JSON.parse(text);
        if (
          manifest &&
          manifest.name === "@deepseek-ai/dsh" &&
          typeof manifest.version === "string" &&
          manifest.version.length > 0
        ) {
          return manifest.version;
        }
      } catch (_) {
        // try the next candidate
      }
    }
  }
  return undefined;
}

/** 组装 GET /dsh-about/version 的响应载荷。 */
async function versionPayload(ctx) {
  try {
    const version = await readDshVersion(ctx);
    if (version === undefined) {
      // 稳定错误码(不随语言变化),由 client 侧 about 字典翻译展示。
      return { ok: false, error: "unable to resolve dsh version" };
    }
    return {
      ok: true,
      version,
      product: "DeepSeek Harness",
      homepage: "https://github.com/deepseek-ai/deepseek-harness",
      plugin: { name: "dsh-about", version: PLUGIN_VERSION, repo: "https://github.com/1010n111/dsh-about" },
    };
  } catch (error) {
    return { ok: false, error: String((error && error.message) || error) };
  }
}

/** GitHub Releases 精简字段,供"更新日志"使用。 */
const RELEASES_URL = "https://api.github.com/repos/deepseek-ai/deepseek-harness/releases?per_page=20";

/**
 * 把 GitHub Release 的双语正文拆成中/英两段,由 client 按界面语言选取。
 * 正文结构:中文段(导航行 + 前言 + `<h3 id="cn-…">` 各节)+ 整行 `---` 分隔线
 * + 英文段(前言 + `<h3 id="en-…">` 各节)。以首个整行 `---` 为界:
 * 英文前言在英文锚点之前,不能用锚点切(会把英文段混入中文)。
 * 无分隔线时整段视为单语,原样返回。
 */
function splitBody(body) {
  const text = String(body || "");
  const match = text.match(/\r?\n---\r?\n/);
  if (!match) return { zh: text, en: text };
  const index = match.index;
  const sepEnd = index + match[0].length;
  return { zh: text.slice(0, index), en: text.slice(sepEnd) };
}

/** 内存缓存:5 分钟内不重复请求 GitHub。 */
let releasesCache = { at: 0, payload: null };
const CACHE_TTL_MS = 5 * 60 * 1000;

async function releasesPayload() {
  const now = Date.now();
  if (releasesCache.payload && now - releasesCache.at < CACHE_TTL_MS) {
    return releasesCache.payload;
  }
  try {
    const res = await fetch(RELEASES_URL, {
      headers: { accept: "application/vnd.github+json", "user-agent": "dsh-about" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`github http ${res.status}`);
    const list = await res.json();
    if (!Array.isArray(list)) throw new Error("bad github payload");
    const releases = list
      .filter((r) => r && !r.draft && typeof r.tag_name === "string")
      .map((r) => {
        const parts = splitBody(String(r.body || ""));
        return {
          tag: r.tag_name,
          name: String(r.name || r.tag_name),
          date: String(r.published_at || "").slice(0, 10),
          url: String(r.html_url || ""),
          bodyZh: parts.zh,
          bodyEn: parts.en,
        };
      });
    releasesCache = { at: now, payload: { ok: true, releases } };
    return releasesCache.payload;
  } catch (error) {
    return { ok: false, error: String((error && error.message) || error) };
  }
}

/**
 * 插件主体:等待 webServer 就绪后注册只读版本端点。
 * @param ctx - Host cordis 上下文。
 */
function apply(ctx) {
  ctx.inject(["webServer"], (webCtx) => {
    const sendJson = (res, body) => {
      const text = JSON.stringify(body);
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(text);
    };
    const routes = [
      { path: "/dsh-about/version", handler: async () => versionPayload(webCtx) },
      { path: "/dsh-about/releases", handler: async () => releasesPayload() },
    ];
    for (const route of routes) {
      webCtx.webServer.register({
        kind: "exact",
        path: route.path,
        handler: async (req, res) => sendJson(res, await route.handler()),
      });
    }
  });
}

export { PLUGIN_VERSION, apply, readDshVersion, versionPayload, releasesPayload, splitBody };