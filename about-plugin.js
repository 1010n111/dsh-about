/**
 * dsh-about 动态插件 — 源码存档 (当前运行包: about-1/pkg-6)
 *
 * 功能:
 *  - 在 Web 设置弹窗左侧导航添加 "关于" 菜单项(设置页 `settings.section` 槽),order=9999 固定末尾
 *  - "关于" 页(中英双语,跟随 DSH 设置面板语言;导航标签同步翻译)
 *  - 版本来源:Host 通过 `clientModules.clientPath()` 反推 dsh 安装根目录(遍历所有 node_modules 层候选),
 *    读取 `@deepseek-ai/dsh/package.json` 的 version 字段(与 `dsh --version` 一致)
 *  - 失败时页面显示具体错误文本,便于诊断
 *  - UI 风格与设置面板一致:--dsw-alias-* 主题 token、14px/22px 正文、行间 1px border-l2 分割线、16px 纵向内边距
 *
 * 版本历史:
 *  - pkg-1 初版(版本路径推导有误:只猜一层 node_modules,读不到版本)
 *  - pkg-2 修复路径推导(遍历所有 node_modules 层候选 + name 校验),失败显示错误详情
 *  - pkg-3 界面固定中文(导航标签 + 页面内容)
 *  - pkg-4 新增"插件版本"行(声明式版本 1.0.0)
 *  - pkg-5 插件版本行描述 about-1 → dsh-about
 *  - pkg-6 菜单 order 30 → 9999,确保"关于"始终为导航最后一项
 *
 * 注意:动态插件定义随 DSH 进程存活,进程重启后需用本文件源码重新 cordis_define + cordis_run。
 */

/* ============================= Host 半区 ============================= */
const hostSource = `
return {
  apply(ctx) {
    const normalize = (p) => String(p).replace(/\\\\/g, '/')

    const readVersion = async () => {
      const clientModules = ctx.get('clientModules')
      const fs = ctx.get('fs')
      if (clientModules === undefined || fs === undefined) return undefined
      const anchors = [
        '@deepseek-ai/dsh-client-modules',
        '@deepseek-ai/dsh-client-runtime',
        '@deepseek-ai/dsh-client-connection',
        '@deepseek-ai/dsh-client-ui-theme',
      ]
      for (const anchor of anchors) {
        const bundle = clientModules.clientPath(anchor)
        if (typeof bundle !== 'string' || bundle.length === 0) continue
        const path = normalize(bundle)
        const candidates = []
        let from = 0
        while (true) {
          const marker = path.indexOf('node_modules', from)
          if (marker < 0) break
          candidates.push(path.slice(0, marker) + 'node_modules/@deepseek-ai/dsh/package.json')
          from = marker + 1
        }
        const tail = path.lastIndexOf('node_modules')
        if (tail >= 0) {
          candidates.push(path.slice(0, tail) + '@deepseek-ai/dsh/package.json')
        }
        for (const candidate of candidates) {
          try {
            const target = await fs.resolve(candidate)
            const text = await fs.readText(target)
            const manifest = JSON.parse(text)
            if (manifest && manifest.name === '@deepseek-ai/dsh' && typeof manifest.version === 'string' && manifest.version.length > 0) {
              return manifest.version
            }
          } catch (_) {
            // try the next candidate
          }
        }
      }
      return undefined
    }

    // 插件自身的声明式版本(动态插件无 package.json,随插件代码维护)
    const PLUGIN = { name: 'dsh-about', version: '1.0.0' }

    harness.handle('about/version', async () => {
      try {
        const version = await readVersion()
        if (version === undefined) {
          return { ok: false, error: 'unable to resolve dsh version' }
        }
        return {
          ok: true,
          version,
          product: 'DeepSeek Harness',
          homepage: 'https://github.com/deepseek-ai/deepseek-harness',
          plugin: PLUGIN,
        }
      } catch (error) {
        return { ok: false, error: String((error && error.message) || error) }
      }
    })
  },
}
`

/* ============================ Client 半区 ============================ */
const clientSource = `
return {
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    // ---- 英文适配:官方 dsh-client-locale 机制(zh/en 字典 + 槽位 locale),缺失时按浏览器语言兜底 ----
    const NS = 'about'
    const DICT = {
      zh: {
        'nav.label': '关于',
        'brand.sub': '本地运行的 DeepSeek Harness 控制台',
        'version.title': '版本',
        'version.desc': '当前运行的 DeepSeek Harness (dsh) 版本',
        'error.read': '无法读取版本信息',
        'error.unknown': '未知错误',
        'error.resolve': '无法解析正在运行的 dsh 版本',
        'plugin.title': '插件版本',
        'plugin.desc': '设置页由动态 Cordis 插件 (dsh-about) 提供',
        'repo.title': '项目主页',
        'repo.desc': '开源代码与更新发布',
        'source.title': '版本来源',
        'source.desc': '版本信息读取自 dsh 安装目录的 package.json'
      },
      en: {
        'nav.label': 'About',
        'brand.sub': 'The locally running DeepSeek Harness console',
        'version.title': 'Version',
        'version.desc': 'Version of DeepSeek Harness (dsh) currently running',
        'error.read': 'Unable to read version information',
        'error.unknown': 'Unknown error',
        'error.resolve': 'Unable to resolve the running dsh version',
        'plugin.title': 'Plugin version',
        'plugin.desc': 'Settings page provided by the dynamic Cordis plugin (dsh-about)',
        'repo.title': 'Project homepage',
        'repo.desc': 'Open-source code and release updates',
        'source.title': 'Version source',
        'source.desc': 'Version read from the dsh package.json in the installation directory'
      }
    }
    const RESOLVE_ERROR_CODE = 'unable to resolve dsh version' // 与 host 半区错误码保持一致
    const browserPrefersEnglish = () => {
      if (typeof document !== 'undefined') {
        const lang = document.documentElement && document.documentElement.lang
        if (lang) return lang.toLowerCase().indexOf('en') === 0
      }
      if (typeof navigator !== 'undefined' && navigator.language) {
        return navigator.language.toLowerCase().indexOf('en') === 0
      }
      return false
    }
    let T = (key) => {
      const dict = browserPrefersEnglish() ? DICT.en : DICT.zh
      return dict[key] !== undefined ? dict[key] : key
    }
    const localeService = ctx.get('locale')
    if (localeService !== undefined) {
      T = localeService.bind(NS)
      ctx.effect(() => localeService.register(NS, DICT), 'dsh-about: dictionaries')
    }

    styles.insert(
      '.dsh-about-root{box-sizing:border-box;flex-direction:column;width:100%;padding:4px 0 0;display:flex}' +
      '.dsh-about-brand{box-sizing:border-box;align-items:center;gap:12px;padding:14px 0 6px;display:flex}' +
      '.dsh-about-logo{box-sizing:border-box;width:40px;height:40px;border-radius:12px;background:var(--dsw-alias-brand-primary);color:var(--dsw-static-neutral-00,#fff);flex:none;align-items:center;justify-content:center;font-size:13px;font-weight:600;letter-spacing:.4px;display:flex;user-select:none}' +
      '.dsh-about-brandText{flex-direction:column;gap:2px;min-width:0;display:flex}' +
      '.dsh-about-name{color:var(--dsw-alias-label-primary);font-size:16px;font-weight:500;line-height:24px}' +
      '.dsh-about-sub{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}' +
      '.dsh-about-row{border-bottom:1px solid var(--dsw-alias-border-l2);align-items:center;gap:8px;padding:16px 0;display:flex}' +
      '.dsh-about-row:last-of-type{border-bottom:none}' +
      '.dsh-about-rowText{flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:48px;display:flex}' +
      '.dsh-about-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}' +
      '.dsh-about-desc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}' +
      '.dsh-about-value{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px;white-space:nowrap;max-width:70%;overflow:hidden;text-overflow:ellipsis}' +
      '.dsh-about-loading{color:var(--dsw-alias-label-secondary)}' +
      '.dsh-about-error{color:var(--dsw-alias-state-error-primary)}' +
      '.dsh-about-link{color:var(--dsw-alias-brand-primary);font-size:14px;line-height:22px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;max-width:68%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.dsh-about-link:hover{text-decoration:underline}' +
      '.dsh-about-open{flex:none}'
    )

    const AboutSection = (props) => {
      const t = (props && typeof props.t === 'function') ? props.t : T
      const [state, setState] = React.useState({ phase: 'loading' })

      React.useEffect(() => {
        let cancelled = false
        host.call('about/version')
          .then((data) => {
            if (cancelled) return
            if (!data || data.ok === false) {
              setState({ phase: 'error', error: (data && data.error) || t('error.unknown') })
              return
            }
            setState({ phase: 'ready', version: data.version, product: data.product || '', homepage: data.homepage || '', plugin: data.plugin || null })
          })
          .catch((err) => {
            if (!cancelled) setState({ phase: 'error', error: String((err && err.message) || err) })
          })
        return () => { cancelled = true }
      }, [])

      const failed = state.phase === 'error'
      const pending = state.phase === 'loading'
      const valueClass = failed ? 'dsh-about-value dsh-about-error' : (pending ? 'dsh-about-value dsh-about-loading' : 'dsh-about-value')
      const versionText = failed ? '—' : (pending ? '…' : 'v' + state.version)

      const row = (title, desc, valueNode) => {
        return React.createElement('div', { className: 'dsh-about-row' },
          React.createElement('div', { className: 'dsh-about-rowText' },
            React.createElement('div', { className: 'dsh-about-title' }, title),
            React.createElement('div', { className: 'dsh-about-desc' }, desc)
          ),
          valueNode
        )
      }
      const pendingValue = (text) => React.createElement('div', { className: valueClass }, text)

      const brand = React.createElement('div', { className: 'dsh-about-brand' },
        React.createElement('div', { className: 'dsh-about-logo' }, 'DSH'),
        React.createElement('div', { className: 'dsh-about-brandText' },
          React.createElement('div', { className: 'dsh-about-name' }, 'DeepSeek Harness'),
          React.createElement('div', { className: 'dsh-about-sub' }, t('brand.sub'))
        )
      )

      const versionDesc = failed
        ? React.createElement('div', { className: 'dsh-about-desc dsh-about-error' }, state.error === RESOLVE_ERROR_CODE ? t('error.resolve') : state.error || t('error.read'))
        : t('version.desc')
      const versionRow = row(t('version.title'), versionDesc, pendingValue(versionText))

      const pluginText = state.plugin ? state.plugin.name + ' · v' + state.plugin.version : ''
      const pluginRow = row(t('plugin.title'), t('plugin.desc'), pendingValue(failed ? '—' : (pending ? '…' : pluginText)))

      const openIcon = React.createElement('svg', { className: 'dsh-about-open', width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        React.createElement('path', { d: 'M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
        React.createElement('path', { d: 'M9 2h5v5', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        React.createElement('path', { d: 'M14 2 7.5 8.5', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' })
      )
      const repoRow = row(t('repo.title'), t('repo.desc'),
        state.homepage
          ? React.createElement('a', { className: 'dsh-about-link', href: state.homepage, target: '_blank', rel: 'noreferrer' },
              state.homepage.replace(/^https?:\\/\\//, ''), openIcon)
          : pendingValue(failed ? '—' : '…')
      )

      const sourceRow = row(t('source.title'), t('source.desc'), pendingValue(failed ? '—' : (pending ? '…' : '@deepseek-ai/dsh')))

      return React.createElement('div', { className: 'dsh-about-root' }, brand, versionRow, pluginRow, repoRow, sourceRow)
    }

    slots.inject('settings.section', () => {
      const spec = { name: 'settings.section', id: 'about', order: 9999, label: () => T('nav.label') }
      if (ctx.get('locale') !== undefined) spec.locale = NS
      return slots.register(spec, () => React.createElement(AboutSection, null))
    })
  },
}
`

module.exports = { hostSource, clientSource }