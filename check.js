// 自检:验证 dsh-about 更新日志实现的纯函数(无框架)。
import fs from "node:fs";

const src = fs.readFileSync(new URL("./lib/client.js", import.meta.url), "utf8");
const archive = fs.readFileSync(new URL("./about-plugin.js", import.meta.url), "utf8");

if (!src.includes('name: "settings.section", id: "1010n111:dsh-about"')) throw new Error("settings section id");
if (src.includes('name: "settings.section", id: "about"')) throw new Error("legacy settings section id");
if (!src.includes('id: "1010n111:dsh-about", order: Number.POSITIVE_INFINITY')) throw new Error("settings section order");
if (!archive.includes("name: 'settings.section', id: '1010n111:dsh-about'")) throw new Error("archive settings section id");
if (archive.includes("name: 'settings.section', id: 'about'")) throw new Error("legacy archive settings section id");
if (!archive.includes("id: '1010n111:dsh-about', order: Number.POSITIVE_INFINITY")) throw new Error("archive settings section order");

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
for (const name of ["stripHtml", "cleanMarkdown", "clampLines"]) {
  fns[name] = new Function("return " + sliceFn(name) + ";")();
}

const html =
  "<h3>新增功能</h3>\n* A\n* B\n* 长行".repeat(15);

const text = fns.stripHtml(html);
const lines = text.split("\n").length;
const clampedLines = fns.clampLines(text, 7).split("\n").length;

// cleanMarkdown:双语导航行与 markdown 语法应被清除,纯文本要点保留(含 CRLF 正文)
const raw =
  "[中文](#cn-v0.1.2-rc.1) | [English](#en-v0.1.2-rc.1)\r\n\r\n" +
  "作为 0.1.2 系列的首个候选版本\r\n\r\n" +
  "<h3 id=\"cn-v0.1.2-rc.1\">新增功能</h3>\r\n\r\n" +
  "* 会话流默认折叠过程内容\r\n---\r\n\r\n" +
  "**加粗** 与 *斜体* 文本";
const cleaned = fns.cleanMarkdown(raw);
if (cleaned.includes("中文") || cleaned.includes("English")) throw new Error("cleanMarkdown nav line");
if (cleaned.includes("|") || cleaned.includes("---")) throw new Error("cleanMarkdown pipe");
if (!cleaned.includes("新增功能") || !cleaned.includes("会话流默认折叠过程内容")) throw new Error("cleanMarkdown content");
if (!cleaned.includes("加粗") || !cleaned.includes("斜体")) throw new Error("cleanMarkdown emphasis");
if (!cleaned.startsWith("作为 0.1.2")) throw new Error("cleanMarkdown leading blank/pipe");

if (lines < 40) throw new Error("stripHtml");
if (clampedLines <= 0 || clampedLines > 7) throw new Error("clampLines");
if (!fns.clampLines(text, 7).endsWith("…")) throw new Error("clampLines ellipsis");
if (fns.clampLines("a\nb", 7) !== "a\nb") throw new Error("clampLines short");

console.log("check OK:", { textLines: lines, clamped: clampedLines, cleanedLines: cleaned.split("\n").length });