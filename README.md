# dsh-about

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web 界面添加一个 **“关于”** 设置页,展示当前运行的 DSH 版本、插件自身版本、项目主页与版本来源。UI 完全复用设置面板的设计规范(`--dsw-alias-*` 主题 token,深浅主题自适应)。

## 特性

- 设置弹窗左侧导航新增 **“关于”** 菜单项,固定在导航**最后一项**(`order: 9999`,其他插件新增菜单也不会排在它后面)
- “关于”页展示:
  | 行 | 内容 |
  |---|---|
  | 版本 | 当前运行的 DSH 版本(与 `dsh --version` 一致) |
  | 插件版本 | `dsh-about · v1.0.0` |
  | 项目主页 | deepseek-harness 仓库外链 |
  | 版本来源 | `@deepseek-ai/dsh` |
- 加载中显示 `…`,读取失败显示 `—` 并给出具体错误文本,便于诊断
- 纯前端 + 一个只读 HTTP 端点,不写任何配置、不改动持久化数据

## 工作原理

```
浏览器 "关于" 页
   │  fetch GET /dsh-about/version
   ▼
Host 半区 (lib/index.js)
   │  1. clientModules.clientPath('<任意官方插件>') → bundle 绝对路径
   │  2. 遍历路径中每一层 node_modules,反推 dsh 安装根目录
   │  3. fs 读取 @deepseek-ai/dsh/package.json,校验 name 后取 version
   ▼
JSON { ok, version, product, homepage, plugin }
```

版本号直接读取运行中安装的 `dsh` 包,因此**不需要硬编码路径**,且与 `dsh --version` 的输出保持一致。

## 安装

> 前置:DSH Web profile(`dsh web` / `--profile web`),dsh ≥ 0.1.1-rc.x

### 1. 一条命令安装 + 挂载

包内声明了 `dsh.bundle.patch`,CLI 会把它自动追加进 profile 的 bundle 堆栈,一次命令即可完成安装与挂载,**无需手工编辑任何 profile 文件**:

```bash
# 已发布到 npm 时:
dsh plugin --profile web add dsh-about

# 或直接从 GitHub 安装(未发布 npm 时):
dsh plugin --profile web add 'github:1010n111/dsh-about'
```

该命令等价于在 `$DSH_HOME/profiles/web` 目录执行 `pnpm add`,并同步
`dsh.profile.bundles`。

> 旧方法(手动挂载)不再需要:`dsh plugin add` 之后,请确认
> `$DSH_HOME/profiles/web/cordis.patch.yml` 中没有遗留的 dsh-about 挂载行。

### 2. 重启并查看

重启 `dsh web`,打开设置弹窗 → 左侧导航末尾的 **“关于”**,即可看到版本信息。

## 卸载

```bash
dsh plugin --profile web remove dsh-about
```

CLI 会同步从 `dsh.profile.bundles` 移除该包;重启后即完全卸载。若之前在
profile 自己的 `cordis.patch.yml` 里手动挂载过,请一并删除旧行。

## 目录结构

```
dsh-about/
├── lib/
│   ├── index.js      # Host 半区:标准 Cordis 插件(ESM),注册 GET /dsh-about/version
│   └── client.js     # 浏览器半区 bundle:__ModuleLoader__.load 注册的工厂
├── package.json      # dsh.client 声明 + exports(./client)
├── cordis.patch.yml  # 组合 overlay(安装即用)
├── README.md
├── LICENSE           # MIT
└── about-plugin.js   # (本仓库维护用)会话内动态插件版源码存档
```

## 开发与本地修改

- 客户端代码是**手写 bundle**(纯 JS + `require("react")`,无构建工具链):修改 `lib/client.js` 后刷新页面即生效(HMR 构建产物会直接覆盖该文件)。
- Host 半区是标准 ESM 插件:修改 `lib/index.js` 后重启 `dsh web`。
- 发布到 npm 前请同步 `package.json` 与 `lib/index.js` 中的 `PLUGIN_VERSION`(本插件在“关于”页展示自身版本)。

## 许可证

[MIT](LICENSE)