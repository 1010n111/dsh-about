// 自检:验证 dsh-about 更新日志实现的纯函数(无框架)。
import fs from "node:fs";

const src = fs.readFileSync(new URL("./lib/client.js", import.meta.url), "utf8");

/** stripHtml 仅在浏览器中使用 document;测试时用简单替代(模拟 innerHTML→textContent)。 */
const documentShim = {
  createElement: () => {
    const el = {
      set innerHTML(v) { this._html = String(v || ""); },
      get textContent() {
        return String(this._html || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      },
    };
    return el;
  },
};

function sliceFn(name) {
  const sig = "function " + name + "(";
  const start = src.indexOf(sig);
  if (start < 0) throw new Error("missing function " + name);
  let i = src.indexOf("{", start), depth = 0;
  do {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") depth--;
    i++;
  } while (depth > 0 && i < src.length);
  return src.slice(start, i);
}

globalThis.document = documentShim;

const fns = {};
for (const name of ["stripHtml", "clampLines"]) {
  fns[name] = new Function("return " + sliceFn(name) + ";")();
}

const html =
  "<h3>新增功能</h3>\n* A\n* B\n* 长行".repeat(15);

const text = fns.stripHtml(html);
const lines = text.split("\n").length;
const clampedLines = fns.clampLines(text, 7).split("\n").length;

if (lines < 40) throw new Error("stripHtml");
if (clampedLines <= 0 || clampedLines > 7) throw new Error("clampLines");
if (!fns.clampLines(text, 7).endsWith("…")) throw new Error("clampLines ellipsis");
if (fns.clampLines("a\nb", 7) !== "a\nb") throw new Error("clampLines short");

console.log("check OK:", { textLines: lines, clamped: clampedLines });