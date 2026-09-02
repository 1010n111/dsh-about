/**
 * dsh-about — Host 半区
 *
 * 标准 DSH Web 插件(Host 侧):在组合中以 `name: 'dsh-about'` 行挂载,
 * 向浏览器提供一个只读 HTTP 端点 `GET /dsh-about/version`。
 *
 * 版本来源:通过 `clientModules.clientPath()` 取到任一 Web 插件 bundle 的
 * 绝对路径,遍历其中出现的每一层 `node_modules` 生成候选,反推 dsh 安装根
 * 目录,再经 `fs` 服务读取 `@deepseek-ai/dsh/package.json` 的 `version`
 * 字段(与 `dsh --version` 输出一致),并用 `name` 字段校验。
 */

/** 插件自身版本,与 package.json 的 version 字段保持一致。 */
const PLUGIN_VERSION = "1.0.0";

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
      return { ok: false, error: "无法解析正在运行的 dsh 版本" };
    }
    return {
      ok: true,
      version,
      product: "DeepSeek Harness",
      homepage: "https://github.com/deepseek-ai/deepseek-harness",
      plugin: { name: "dsh-about", version: PLUGIN_VERSION },
    };
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
    webCtx.webServer.register({
      kind: "exact",
      path: "/dsh-about/version",
      handler: async (req, res) => {
        const body = JSON.stringify(await versionPayload(webCtx));
        res.writeHead(200, {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        });
        res.end(body);
      },
    });
  });
}

export { PLUGIN_VERSION, apply, readDshVersion, versionPayload };