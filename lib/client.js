/**
 * dsh-about — 浏览器半区 bundle
 *
 * 由 dsh 的 client 模块系统加载:window.__ModuleLoader__.load 注册本包的
 * factory,工厂内 require 从平台种子表解析(react)。
 *
 * 在 Web 设置面板注册“关于”页:`settings.section` 槽,order=9999 固定为
 * 导航末尾;页面经 fetch 调用 Host 半区的 GET /dsh-about/version 读取
 * 当前运行的 DSH 版本。
 *
 * 样式策略(双保险):全部视觉样式直接写在元素级 React style 上(不依赖
 * 任何样式表注入,保证任何环境下布局与配色都生效);同时按官方模式注入
 * 一份 <style>(仅补充 :hover 等无法内联的细节)。主题变量
 * var(--dsw-alias-*) 定义在页面根上,深浅主题自动适配,均带回退值。
 */
window.__ModuleLoader__.load({
  id: "dsh-about",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");

    /** 关于页字典:zh 为准,en 补齐,键集保持一致(官方 dsh-client-locale 契约)。 */
    var NS = "about";
    var DICT = {
      zh: {
        "nav.label": "关于",
        "brand.sub": "本地运行的 DeepSeek Harness 控制台",
        "version.title": "版本",
        "version.desc": "当前运行的 DeepSeek Harness (dsh) 版本",
        "error.read": "无法读取版本信息",
        "error.unknown": "未知错误",
        "error.resolve": "无法解析正在运行的 dsh 版本",
        "plugin.title": "插件版本",
        "plugin.desc": "设置页由 dsh-about 插件提供",
        "pluginRepo.title": "插件仓库",
        "pluginRepo.desc": "dsh-about 的 GitHub 源码仓库",
        "repo.title": "项目主页",
        "repo.desc": "开源代码与更新发布",
        "source.title": "版本来源",
        "source.desc": "版本信息读取自 dsh 安装目录的 package.json",
        "changelog.title": "更新日志",
        "changelog.desc": "来自 deepseek-harness 的版本更新 (GitHub Releases)",
        "changelog.current": "当前版本",
        "changelog.expand": "展开",
        "changelog.collapse": "收起",
        "changelog.open": "完整日志",
        "changelog.error": "无法获取更新日志,请在 GitHub 查看",
        "changelog.empty": "暂无更新日志"
      },
      en: {
        "nav.label": "About",
        "brand.sub": "The locally running DeepSeek Harness console",
        "version.title": "Version",
        "version.desc": "Version of DeepSeek Harness (dsh) currently running",
        "error.read": "Unable to read version information",
        "error.unknown": "Unknown error",
        "error.resolve": "Unable to resolve the running dsh version",
        "plugin.title": "Plugin version",
        "plugin.desc": "Settings page provided by the dsh-about plugin",
        "pluginRepo.title": "Plugin repository",
        "pluginRepo.desc": "GitHub source repository of dsh-about",
        "repo.title": "Project homepage",
        "repo.desc": "Open-source code and release updates",
        "source.title": "Version source",
        "source.desc": "Version read from the dsh package.json in the installation directory",
        "changelog.title": "Changelog",
        "changelog.desc": "Version updates from deepseek-harness (GitHub Releases)",
        "changelog.current": "current",
        "changelog.expand": "Expand",
        "changelog.collapse": "Collapse",
        "changelog.open": "Full changelog",
        "changelog.error": "Could not fetch the changelog, see GitHub",
        "changelog.empty": "No changelog available"
      }
    };

    /** host 端错误码(与 lib/index.js 保持一致):client 负责翻译展示。 */
    var RESOLVE_ERROR_CODE = "unable to resolve dsh version";

    /** 无 locale 服务(旧组合)时,按浏览器语言选择字典。 */
    function browserPrefersEnglish() {
      if (typeof document !== "undefined") {
        var lang = document.documentElement && document.documentElement.lang;
        if (lang) return lang.toLowerCase().indexOf("en") === 0;
      }
      if (typeof navigator !== "undefined" && navigator.language) {
        return navigator.language.toLowerCase().indexOf("en") === 0;
      }
      return false;
    }

    /** 顶层翻译器:有 locale 服务时在 apply 中绑定命名空间,否则查本地字典。 */
    var T = function (key) {
      var dict = browserPrefersEnglish() ? DICT.en : DICT.zh;
      return dict[key] !== undefined ? dict[key] : key;
    };

    /**
 * 当前界面语言 id(zh/en):优先 locale 服务(设置面板切换即时生效),
 * 缺失时按浏览器语言兜底。供更新日志选择 zh/en 段落。
 */
    var LOCALE_SERVICE = undefined;
    var currentLang = function () {
      if (LOCALE_SERVICE !== undefined) {
        try {
          var snap = LOCALE_SERVICE.getLocale();
          if (snap && typeof snap.active === "string") return snap.active;
        } catch (_) {
          // fall through to browser detection
        }
      }
      return browserPrefersEnglish() ? "en" : "zh";
    };

    /** 元素级内联样式(主要视觉来源,优先级高于注入的 CSS)。 */
    var S = {
      root: { boxSizing: "border-box", display: "flex", flexDirection: "column", width: "100%", padding: "4px 0 0" },
      brand: { boxSizing: "border-box", display: "flex", alignItems: "center", gap: "12px", padding: "14px 0 6px" },
      logo: {
        boxSizing: "border-box",
        width: "40px",
        height: "40px",
        borderRadius: "12px",
        background: "var(--dsw-alias-brand-primary, #4176e6)",
        color: "#fff",
        flex: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        fontWeight: "600",
        letterSpacing: ".4px",
        userSelect: "none",
      },
      brandText: { display: "flex", flexDirection: "column", gap: "2px", minWidth: "0" },
      name: { color: "var(--dsw-alias-label-primary, inherit)", fontSize: "16px", fontWeight: "500", lineHeight: "24px" },
      sub: { color: "var(--dsw-alias-label-secondary, inherit)", fontSize: "12px", lineHeight: "18px" },
      row: {
        boxSizing: "border-box",
        borderBottom: "1px solid var(--dsw-alias-border-l2, #e1e5ee)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "16px 0",
      },
      rowLast: { borderBottom: "0px none transparent" },
      rowText: { display: "flex", flexDirection: "column", flex: "1", gap: "4px", minWidth: "0", paddingRight: "48px" },
      title: { color: "var(--dsw-alias-label-primary, inherit)", fontSize: "14px", fontWeight: "400", lineHeight: "22px" },
      desc: { color: "var(--dsw-alias-label-secondary, inherit)", fontSize: "12px", lineHeight: "18px" },
      value: {
        color: "var(--dsw-alias-label-primary, inherit)",
        fontSize: "14px",
        lineHeight: "22px",
        whiteSpace: "nowrap",
        maxWidth: "70%",
        overflow: "hidden",
        textOverflow: "ellipsis",
      },
      loading: { color: "var(--dsw-alias-label-secondary, inherit)" },
      error: { color: "var(--dsw-alias-state-error-primary, #d96b5a)" },
      link: {
        color: "var(--dsw-alias-brand-primary, #4176e6)",
        fontSize: "14px",
        lineHeight: "22px",
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        maxWidth: "68%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
    };

    /** 增强样式表:仅补充内联样式做不到的细节(如链接 hover)。 */
    var HOVER_CSS =
      ".dsh-about-link:hover{text-decoration:underline}" +
      ".dsh-about-logo{user-select:none}" +
      ".dsh-about-cl-item{border:1px solid var(--dsw-alias-border-l2, #e1e5ee);border-radius:10px;margin:8px 0;overflow:hidden}" +
      ".dsh-about-cl-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;cursor:pointer;background:none;border:none;width:100%;text-align:left;font:inherit;color:inherit}" +
      ".dsh-about-cl-head:hover{background:var(--dsw-alias-fill-hover, rgba(127,127,127,.08))}" +
      ".dsh-about-cl-body{border-top:1px solid var(--dsw-alias-border-l2, #e1e5ee);padding:10px 12px;white-space:pre-wrap;word-break:break-word}" +
      ".dsh-about-cl-badge{flex:none;font-size:11px;line-height:1;padding:3px 7px;border-radius:999px;background:var(--dsw-alias-fill-strong, rgba(127,127,127,.16));color:var(--dsw-alias-label-secondary, inherit)}" +
      ".dsh-about-cl-badge.current{background:var(--dsw-alias-brand-primary, #4176e6);color:#fff}";

    /** 读取 Host 提供的版本信息(失败时页面显示错误文本)。 */
    function fetchVersion() {
      return fetch("/dsh-about/version", { headers: { accept: "application/json" } }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      });
    }

    /** 读取 deepseek-harness 的更新日志(Host 半区代理 GitHub Releases)。 */
    function fetchReleases() {
      return fetch("/dsh-about/releases", { headers: { accept: "application/json" } }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      });
    }

    /** 释放 release 说明中的 HTML,保留纯文本。 */
    function stripHtml(html) {
      var div = document.createElement("div");
      div.innerHTML = html || "";
      return div.textContent || "";
    }

    /**
     * 清理裸 markdown:去掉双语导航行([中文](#cn-x) | [English](#en-x))、
     * 链接语法、粗体星号、`---` 分隔线与多余的 `#` 标题符,保留纯文本要点。
     */
    function cleanMarkdown(text) {
      return String(text || "")
        .replace(/\r\n/g, "\n")              // 统一换行(GitHub 正文为 CRLF)
        .replace(/\[[^\]]*\]\([^)]*\)/g, "") // 链接(含双语导航行)
        .replace(/^#{1,6}\s*/gm, "")          // 标题符
        .replace(/\*\*?([^*]*)\*\*?/g, "$1") // 粗体/斜体
        .replace(/^---+$/gm, "")              // 分隔线
        .replace(/^\s*[-*]\s+/gm, "")         // 无序列表符
        .replace(/^\s{0,3}\d+\.\s+/gm, "")    // 有序列表符
        .replace(/^[ \t]*\|?[ \t]*$/gm, "")   // 链接移除后的导航行残留(| 或空)
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    /** 展开时折叠为若干行(约每行 90 字符)。 */
    function clampLines(text, maxLines) {
      var lines = text.split("\n");
      var total = 0;
      var kept = [];
      for (var i = 0; i < lines.length; i++) {
        var width = Math.max(1, Math.ceil(lines[i].length / 90));
        if (total + width > maxLines) break;
        kept.push(lines[i]);
        total += width;
      }
      return kept.join("\n") + (total >= maxLines && kept.length < lines.length ? "…" : "");
    }

    function row(title, desc, valueNode, isLast) {
      return React.createElement(
        "div",
        { className: "dsh-about-row", style: Object.assign({}, S.row, isLast ? S.rowLast : {}) },
        React.createElement(
          "div",
          { className: "dsh-about-rowText", style: S.rowText },
          React.createElement("div", { className: "dsh-about-title", style: S.title }, title),
          React.createElement("div", { className: "dsh-about-desc", style: S.desc }, desc)
        ),
        valueNode
      );
    }

    /** 更新日志块:拉取 GitHub Releases,当前版本置顶高亮,可展开/收起。 */
    function ChangelogSection(props) {
      var t = props && typeof props.t === "function" ? props.t : T;
      var currentVersion = props.currentVersion || "";
      var state = React.useState({ phase: "loading", expanded: {} });
      var setState = state[1];

      React.useEffect(function () {
        var cancelled = false;
        fetchReleases()
          .then(function (data) {
            if (cancelled) return;
            if (!data || data.ok === false) throw new Error((data && data.error) || "bad response");
            var releases = data.releases;
            if (!Array.isArray(releases)) throw new Error("bad response");
            setState({ phase: "ready", releases: releases, expanded: {} });
          })
          .catch(function (err) {
            if (cancelled) return;
            setState({ phase: "error", error: String((err && err.message) || err) });
          });
        return function () {
          cancelled = true;
        };
      }, []);

      var current = state[0];
      function toggle(tag) {
        setState(function (prev) {
          var expanded = Object.assign({}, prev.expanded || {});
          expanded[tag] = !expanded[tag];
          return { phase: prev.phase, releases: prev.releases, expanded: expanded };
        });
      }

      var block;
      if (current.phase === "loading") {
        block = React.createElement("div", { className: "dsh-about-desc", style: S.desc }, "…");
      } else if (current.phase === "error") {
        block = React.createElement(
          "div",
          { className: "dsh-about-desc dsh-about-error", style: Object.assign({}, S.desc, S.error) },
          t("changelog.error")
        );
      } else {
        var items = current.releases
          .filter(function (r) {
            return r && r.tag;
          })
          .slice(0, 5)
          .map(function (r) {
            var tag = r.tag.replace(/^dsh-/, "");
            var isCurrent = tag === currentVersion;
            var expanded = !!(current.expanded || {})[r.tag];
            var raw = currentLang().indexOf("en") === 0 ? (r.bodyEn || r.bodyZh || "") : (r.bodyZh || r.bodyEn || "");
            var body = cleanMarkdown(stripHtml(raw));
            var text = expanded ? body : clampLines(body, 7);
            var bodyNode = text
              ? React.createElement("div", { className: "dsh-about-cl-body", style: Object.assign({}, S.desc, { margin: 0 }) }, text)
              : null;
            return React.createElement(
              "div",
              { key: r.tag, className: "dsh-about-cl-item" },
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "dsh-about-cl-head",
                  onClick: function () {
                    toggle(r.tag);
                  },
                },
                React.createElement(
                  "div",
                  { className: "dsh-about-title", style: Object.assign({}, S.title, { margin: 0, lineHeight: "18px" }) },
                  tag,
                  " · ",
                  r.date
                ),
                React.createElement(
                  "span",
                  { className: "dsh-about-cl-badge" + (isCurrent ? " current" : ""), style: isCurrent ? { background: "var(--dsw-alias-brand-primary, #4176e6)", color: "#fff" } : {} },
                  isCurrent ? t("changelog.current") : (expanded ? t("changelog.collapse") : t("changelog.expand"))
                )
              ),
              bodyNode
            );
          });
        block = items.length
          ? React.createElement("div", null, items)
          : React.createElement("div", { className: "dsh-about-desc", style: S.desc }, t("changelog.empty"));
      }

      var openLink = current.phase === "ready"
        ? React.createElement(
            "a",
            { className: "dsh-about-link", style: S.link, href: "https://github.com/deepseek-ai/deepseek-harness/releases", target: "_blank", rel: "noreferrer" },
            t("changelog.open"),
            React.createElement("svg", { className: "dsh-about-open", width: 12, height: 12, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
              React.createElement("path", { d: "M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }),
              React.createElement("path", { d: "M9 2h5v5", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }),
              React.createElement("path", { d: "M14 2 7.5 8.5", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" })
            )
          )
        : null;

      return React.createElement(
        "div",
        null,
        row(t("changelog.title"), t("changelog.desc"), openLink, true),
        block
      );
    }

    function AboutSection(props) {
      var t = props && typeof props.t === "function" ? props.t : T;
      var state = React.useState({ phase: "loading" });
      var setState = state[1];

      React.useEffect(function () {
        var cancelled = false;
        fetchVersion()
          .then(function (data) {
            if (cancelled) return;
            if (!data || data.ok === false) {
              setState({ phase: "error", error: (data && data.error) || t("error.unknown") });
              return;
            }
            setState({ phase: "ready", version: data.version, product: data.product || "", homepage: data.homepage || "", plugin: data.plugin || null });
          })
          .catch(function (err) {
            if (!cancelled) setState({ phase: "error", error: String((err && err.message) || err) });
          });
        return function () {
          cancelled = true;
        };
      }, []);

      var current = state[0];
      var failed = current.phase === "error";
      var pending = current.phase === "loading";
      var valueClass = "dsh-about-value";
      var valueStyle = Object.assign({}, S.value, failed ? S.error : pending ? S.loading : {});
      var versionText = failed ? "—" : pending ? "…" : "v" + current.version;

      function row(title, desc, valueNode, isLast) {
        return React.createElement(
          "div",
          { className: "dsh-about-row", style: Object.assign({}, S.row, isLast ? S.rowLast : {}) },
          React.createElement(
            "div",
            { className: "dsh-about-rowText", style: S.rowText },
            React.createElement("div", { className: "dsh-about-title", style: S.title }, title),
            React.createElement("div", { className: "dsh-about-desc", style: S.desc }, desc)
          ),
          valueNode
        );
      }
      function pendingValue(text) {
        return React.createElement("div", { className: valueClass, style: valueStyle }, text);
      }

      var brand = React.createElement(
        "div",
        { className: "dsh-about-brand", style: S.brand },
        React.createElement("div", { className: "dsh-about-logo", style: S.logo }, "DSH"),
        React.createElement(
          "div",
          { className: "dsh-about-brandText", style: S.brandText },
          React.createElement("div", { className: "dsh-about-name", style: S.name }, "DeepSeek Harness"),
          React.createElement("div", { className: "dsh-about-sub", style: S.sub }, t("brand.sub"))
        )
      );

      var versionDesc = failed
        ? React.createElement("div", { className: "dsh-about-desc dsh-about-error", style: Object.assign({}, S.desc, S.error) }, current.error === RESOLVE_ERROR_CODE ? t("error.resolve") : current.error || t("error.read"))
        : t("version.desc");
      var versionRow = row(t("version.title"), versionDesc, pendingValue(versionText));

      var pluginText = current.plugin ? current.plugin.name + " · v" + current.plugin.version : "";
      var pluginRow = row(t("plugin.title"), t("plugin.desc"), pendingValue(failed ? "—" : pending ? "…" : pluginText));

      var openIcon = React.createElement(
        "svg",
        { className: "dsh-about-open", width: 12, height: 12, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
        React.createElement("path", { d: "M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }),
        React.createElement("path", { d: "M9 2h5v5", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }),
        React.createElement("path", { d: "M14 2 7.5 8.5", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" })
      );
      var repoValue = current.homepage
        ? React.createElement("a", { className: "dsh-about-link", style: S.link, href: current.homepage, target: "_blank", rel: "noreferrer" }, current.homepage.replace(/^https?:\/\//, ""), openIcon)
        : pendingValue(failed ? "—" : "…");
      var repoRow = row(t("repo.title"), t("repo.desc"), repoValue);

      var pluginRepo = current.plugin && current.plugin.repo ? current.plugin.repo : "";
      var pluginRepoValue = pluginRepo
        ? React.createElement("a", { className: "dsh-about-link", style: S.link, href: pluginRepo, target: "_blank", rel: "noreferrer" }, pluginRepo.replace(/^https?:\/\//, ""), openIcon)
        : pendingValue(failed ? "—" : pending ? "…" : "");
      var pluginRepoRow = row(t("pluginRepo.title"), t("pluginRepo.desc"), pluginRepoValue);

      var sourceRow = row(t("source.title"), t("source.desc"), pendingValue(failed ? "—" : pending ? "…" : "@deepseek-ai/dsh"));

      var changelog = React.createElement(ChangelogSection, { t: t, currentVersion: failed || pending ? "" : current.version });

      return React.createElement("div", { className: "dsh-about-root", style: S.root }, brand, versionRow, pluginRow, pluginRepoRow, repoRow, sourceRow, changelog);
    }

    /**
     * 插件主体:按官方模式注入增强样式表,并向 settings.section
     * 注册“关于”页。布局与配色不依赖注入(元素级内联样式)。
     * @param ctx - client cordis 上下文(需声明 slots 注入)。
     */
    function apply(ctx) {
      var localeService = ctx.get("locale");
      if (localeService !== undefined) {
        LOCALE_SERVICE = localeService;
        T = localeService.bind(NS);
        ctx.effect(function () { return localeService.register(NS, DICT); }, "dsh-about: dictionaries");
      }
      if (typeof document !== "undefined") {
        ctx.effect(
          function () {
            var tag = document.createElement("style");
            tag.dataset.plugin = "dsh-about";
            tag.dataset.pluginCss = "dsh-about/enhance";
            tag.textContent = HOVER_CSS;
            document.head.appendChild(tag);
            return function () {
              tag.remove();
            };
          },
          "dsh-about: enhance stylesheet"
        );
      }
      ctx.slots.inject("settings.section", function () {
        var spec = { name: "settings.section", id: "about", order: 9999, label: function () { return T("nav.label"); } };
        if (ctx.get("locale") !== undefined) spec.locale = NS;
        return ctx.slots.register(spec, function () { return React.createElement(AboutSection, null); });
      });
    }

    exports.apply = apply;
    exports.inject = ["slots"];
    return module.exports;
  },
});