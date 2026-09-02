/**
 * dsh-about — 浏览器半区 bundle
 *
 * 由 dsh 的 client 模块系统加载:window.__ModuleLoader__.load 注册本包的
 * factory,工厂内 require 从平台种子表解析(react)。
 *
 * 在 Web 设置面板注册“关于”页:`settings.section` 槽,order=9999 固定为
 * 导航末尾;页面经 fetch 调用 Host 半区的 GET /dsh-about/version 读取
 * 当前运行的 DSH 版本。UI 与设置面板一致(--dsw-alias-* 主题 token)。
 */
window.__ModuleLoader__.load({
  id: "dsh-about",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");

    var CSS =
      ".dsh-about-root{box-sizing:border-box;flex-direction:column;width:100%;padding:4px 0 0;display:flex}" +
      ".dsh-about-brand{box-sizing:border-box;align-items:center;gap:12px;padding:14px 0 6px;display:flex}" +
      ".dsh-about-logo{box-sizing:border-box;width:40px;height:40px;border-radius:12px;background:var(--dsw-alias-brand-primary);color:var(--dsw-static-neutral-00,#fff);flex:none;align-items:center;justify-content:center;font-size:13px;font-weight:600;letter-spacing:.4px;display:flex;user-select:none}" +
      ".dsh-about-brandText{flex-direction:column;gap:2px;min-width:0;display:flex}" +
      ".dsh-about-name{color:var(--dsw-alias-label-primary);font-size:16px;font-weight:500;line-height:24px}" +
      ".dsh-about-sub{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}" +
      ".dsh-about-row{border-bottom:1px solid var(--dsw-alias-border-l2);align-items:center;gap:8px;padding:16px 0;display:flex}" +
      ".dsh-about-row:last-of-type{border-bottom:none}" +
      ".dsh-about-rowText{flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:48px;display:flex}" +
      ".dsh-about-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}" +
      ".dsh-about-desc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}" +
      ".dsh-about-value{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px;white-space:nowrap;max-width:70%;overflow:hidden;text-overflow:ellipsis}" +
      ".dsh-about-loading{color:var(--dsw-alias-label-secondary)}" +
      ".dsh-about-error{color:var(--dsw-alias-state-error-primary)}" +
      ".dsh-about-link{color:var(--dsw-alias-brand-primary);font-size:14px;line-height:22px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;max-width:68%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".dsh-about-link:hover{text-decoration:underline}" +
      ".dsh-about-open{flex:none}";

    /** 读取 Host 提供的版本信息(失败时页面显示错误文本)。 */
    function fetchVersion() {
      return fetch("/dsh-about/version", { headers: { accept: "application/json" } }).then((res) => {
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

      var phase = state[0].phase;
      var failed = phase === "error";
      var pending = phase === "loading";
      var valueClass = failed ? "dsh-about-value dsh-about-error" : pending ? "dsh-about-value dsh-about-loading" : "dsh-about-value";
      var versionText = failed ? "—" : pending ? "…" : "v" + state[0].version;

      function row(title, desc, valueNode) {
        return React.createElement(
          "div",
          { className: "dsh-about-row" },
          React.createElement(
            "div",
            { className: "dsh-about-rowText" },
            React.createElement("div", { className: "dsh-about-title" }, title),
            React.createElement("div", { className: "dsh-about-desc" }, desc)
          ),
          valueNode
        );
      }
      function pendingValue(text) {
        return React.createElement("div", { className: valueClass }, text);
      }

      var brand = React.createElement(
        "div",
        { className: "dsh-about-brand" },
        React.createElement("div", { className: "dsh-about-logo" }, "DSH"),
        React.createElement(
          "div",
          { className: "dsh-about-brandText" },
          React.createElement("div", { className: "dsh-about-name" }, "DeepSeek Harness"),
          React.createElement("div", { className: "dsh-about-sub" }, "本地运行的 DeepSeek Harness 控制台")
        )
      );

      var versionDesc = failed
        ? React.createElement("div", { className: "dsh-about-desc dsh-about-error" }, state[0].error || "无法读取版本信息")
        : "当前运行的 DeepSeek Harness (dsh) 版本";
      var versionRow = row("版本", versionDesc, pendingValue(versionText));

      var pluginText = state[0].plugin ? state[0].plugin.name + " · v" + state[0].plugin.version : "";
      var pluginRow = row("插件版本", "设置页由 dsh-about 插件提供", pendingValue(failed ? "—" : pending ? "…" : pluginText));

      var openIcon = React.createElement(
        "svg",
        { className: "dsh-about-open", width: 12, height: 12, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
        React.createElement("path", { d: "M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }),
        React.createElement("path", { d: "M9 2h5v5", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }),
        React.createElement("path", { d: "M14 2 7.5 8.5", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" })
      );
      var repoRow = row(
        "项目主页",
        "开源代码与更新发布",
        state[0].homepage
          ? React.createElement(
              "a",
              { className: "dsh-about-link", href: state[0].homepage, target: "_blank", rel: "noreferrer" },
              state[0].homepage.replace(/^https?:\/\//, ""),
              openIcon
            )
          : pendingValue(failed ? "—" : "…")
      );

      var sourceRow = row("版本来源", "版本信息读取自 dsh 安装目录的 package.json", pendingValue(failed ? "—" : pending ? "…" : "@deepseek-ai/dsh"));

      return React.createElement("div", { className: "dsh-about-root" }, brand, versionRow, pluginRow, repoRow, sourceRow);
    }

    /**
     * 插件主体:注入页面样式,向 settings.section 注册“关于”页。
     * @param ctx - client cordis 上下文(需声明 slots 注入)。
     */
    function apply(ctx) {
      var style = document.createElement("style");
      style.textContent = CSS;
      document.head.appendChild(style);
      ctx.effect(function () {
        style.remove();
      });
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