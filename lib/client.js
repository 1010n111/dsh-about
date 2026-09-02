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
      ".dsh-about-logo{user-select:none}";

    /** 读取 Host 提供的版本信息(失败时页面显示错误文本)。 */
    function fetchVersion() {
      return fetch("/dsh-about/version", { headers: { accept: "application/json" } }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      });
    }

    function AboutSection() {
      var state = React.useState({ phase: "loading" });
      var setState = state[1];

      React.useEffect(function () {
        var cancelled = false;
        fetchVersion()
          .then(function (data) {
            if (cancelled) return;
            if (!data || data.ok === false) {
              setState({ phase: "error", error: (data && data.error) || "未知错误" });
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
          React.createElement("div", { className: "dsh-about-sub", style: S.sub }, "本地运行的 DeepSeek Harness 控制台")
        )
      );

      var versionDesc = failed
        ? React.createElement("div", { className: "dsh-about-desc dsh-about-error", style: Object.assign({}, S.desc, S.error) }, current.error || "无法读取版本信息")
        : "当前运行的 DeepSeek Harness (dsh) 版本";
      var versionRow = row("版本", versionDesc, pendingValue(versionText));

      var pluginText = current.plugin ? current.plugin.name + " · v" + current.plugin.version : "";
      var pluginRow = row("插件版本", "设置页由 dsh-about 插件提供", pendingValue(failed ? "—" : pending ? "…" : pluginText));

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
      var repoRow = row("项目主页", "开源代码与更新发布", repoValue);

      var sourceRow = row("版本来源", "版本信息读取自 dsh 安装目录的 package.json", pendingValue(failed ? "—" : pending ? "…" : "@deepseek-ai/dsh"), true);

      return React.createElement("div", { className: "dsh-about-root", style: S.root }, brand, versionRow, pluginRow, repoRow, sourceRow);
    }

    /**
     * 插件主体:按官方模式注入增强样式表,并向 settings.section
     * 注册“关于”页。布局与配色不依赖注入(元素级内联样式)。
     * @param ctx - client cordis 上下文(需声明 slots 注入)。
     */
    function apply(ctx) {
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
        return ctx.slots.register(
          { name: "settings.section", id: "about", order: 9999, label: function () { return "关于"; } },
          function () {
            return React.createElement(AboutSection, null);
          }
        );
      });
    }

    exports.apply = apply;
    exports.inject = ["slots"];
    return module.exports;
  },
});