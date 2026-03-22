# JollyMusic 技术文档

## 项目概述

JollyMusic 是一个多平台音源聚合的音乐播放器，支持网易云音乐、QQ音乐歌名搜索和B站视频音频提取。提供 H5 网页和 Android App 两种客户端形态，后端为无状态代理服务。

**在线体验**：https://jollytang.github.io/JollyMusic/

## 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    客户端层                           │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │   H5 网页     │    │     Android App           │   │
│  │  (uni-app)   │    │  ┌──────────┐ ┌────────┐ │   │
│  │              │    │  │ WebView  │ │ Native │ │   │
│  │  Vue 3       │    │  │ (UI层)   │ │ (播放层)│ │   │
│  │  Pinia       │    │  │          │ │MediaPlayer│  │
│  │  TypeScript  │    │  │          │ │MediaSession│ │
│  └──────┬───────┘    │  └────┬─────┘ └────┬───┘ │   │
│         │            │       │             │      │   │
│         └────────────┼───────┴─────────────┘      │   │
│                      └──────────────────────────┘   │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS
┌────────────────────────┴────────────────────────────┐
│                    后端代理层                         │
│         Node.js + Express (无状态)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  B站适配器 │ │ 网易云适配器│ │ QQ音乐适配器│            │
│  └─────┬────┘ └─────┬────┘ └─────┬────┘            │
└────────┼────────────┼────────────┼──────────────────┘
         │            │            │
    B站 API      网易云 API     QQ音乐 API
```

## 核心设计亮点

### 1. 音源适配器模式（策略模式）

后端采用适配器模式接入多个音乐平台，每个平台实现统一接口，新增平台只需添加一个适配器模块，零侵入已有代码。

```
server/src/
├── bilibili/       # B站适配器
│   ├── video.ts    # 视频信息获取
│   ├── audio.ts    # 音频流获取
│   └── wbi.ts      # WBI签名算法
├── netease/        # 网易云适配器
│   ├── search.ts   # 搜索
│   └── song.ts     # 歌曲URL/详情
├── qqmusic/        # QQ音乐适配器
│   ├── search.ts   # 搜索
│   └── song.ts     # 歌曲URL
└── routes/
    └── music.ts    # 统一路由，根据 platform 参数分发
```

**设计决策**：统一路由 `/api/music/search?platform=netease&keyword=xxx`，前端不感知具体平台的 API 差异。新增平台时后端加一个目录 + 路由加一个 case，前端 Tab 加一个选项即可。

**实际扩展验证**：从网易云到 QQ 音乐的接入只改了 3 个文件共 85 行代码，验证了架构的扩展性。

### 2. 混合渲染架构（WebView + Native）

Android App 采用 Capacitor 混合架构，UI 层运行在 WebView 中复用 H5 代码，播放核心下沉到原生层解决 WebView 后台节流问题。

**问题**：Android 系统在 App 切到后台时会节流 WebView 的 JS 执行，导致歌曲播完后无法自动切到下一首。

**解决方案**：播放链路完全下沉到原生层。

| 层级 | 职责 | 技术 |
|------|------|------|
| WebView (JS) | UI 渲染、用户交互、搜索、歌单管理 | Vue 3 + Pinia |
| Native (Java) | 音频播放、队列管理、自动切歌、URL 获取 | MediaPlayer + HttpURLConnection |
| 桥接 | JS ↔ Native 双向通信 | Capacitor Plugin API |

**关键流程**：
- JS 端播放歌曲时，将完整队列（曲目元数据 + 播放模式）同步到原生层
- 歌曲结束后，原生层自主计算下一首 → 向后端 HTTP 请求获取音频 URL → 播放
- 原生层通过 `trackChanged` 事件通知 JS 同步 UI
- 整个切歌链路不依赖 WebView，后台播放无中断

**平台检测**：通过 `AudioAdapter` 接口抽象音频操作，运行时根据 `Capacitor.isNativePlatform()` 选择实现：
- Android → `NativeAudioAdapter`（原生 MediaPlayer）
- Web → `WebAudioAdapter`（uni.createInnerAudioContext）

两套实现对上层完全透明，player store 的业务逻辑无需区分平台。

### 3. 后端无状态设计

后端是纯代理服务，不存储任何用户数据。

**演进历程**：v1.0 使用 SQLite 存歌单 → v1.1 迁移到客户端 localStorage → 后端变为无状态代理。

**优势**：
- 部署简单：无数据库，Docker 镜像极小
- 水平扩展：任意多实例，无需数据同步
- 免维护：无数据迁移、无备份压力
- 低成本：可部署到 Hugging Face Spaces 等免费平台

**代理职责**：
- B站音频/图片代理（绕过防盗链 Referer 检查）
- 网易云/QQ音乐 API 代理（统一入口，处理地域限制）

### 4. Android MediaSession 集成

通过标准 Android MediaSession API 实现系统级媒体控制，一次注册自动支持所有入口：

- 锁屏媒体控制卡片
- 通知栏 MediaStyle 播放通知（歌名、封面、控制按钮）
- 蓝牙耳机按键
- Android Auto / 车载系统
- 系统音量面板

**实现要点**：
- `AudioService`（Foreground Service）持有 MediaSession，保证后台存活
- `NativeAudioPlugin` 在播放/暂停/切歌时同步更新 MediaSession 的 metadata 和 playback state
- 通知栏按钮通过 `MediaButtonReceiver` 广播接收器回调到插件
- 封面图片异步下载后设置到 MediaMetadata 的 `ALBUM_ART` 字段

**音频焦点策略**：注册 `AudioFocusRequest` 但 `OnAudioFocusChangeListener` 中故意不响应，允许与游戏/视频等其他 App 的音频混合播放。

### 5. OTA 热更新机制

前端代码更新无需用户重新下载 APK，App 启动时自动检查并静默更新。

**架构**：
```
GitHub Actions 构建 → h5-bundle.zip 发布到 GitHub Releases
                                    ↑
App 启动 → 查 Releases API → 对比版本号 → 下载 zip → 替换本地 Web 资源
```

**技术选型**：使用 `@capgo/capacitor-updater`（开源），配置为手动模式（`autoUpdate: false`），自行控制更新时机和版本比对逻辑。

**更新策略**：
- 仅前端（H5）变更：OTA 自动推送，用户无感
- 原生代码变更：需重新构建 APK，用户手动下载（签名一致可覆盖安装，数据不丢失）

### 6. 统一数据模型与向后兼容

Track 数据模型通过 `source` 字段支持多平台，同时向后兼容历史数据：

```typescript
interface Track {
  id: string;
  source?: 'bilibili' | 'netease' | 'qq';  // 新增，可选
  sourceId?: string;                         // 平台侧 ID
  bvid: string;                              // B站字段，保留兼容
  cid: number;
  title: string;
  artist: string;
  cover: string;
  duration: number;
  isVip?: boolean;                           // VIP 标记
}
```

**兼容策略**：`source` 字段可选，缺失时默认 `bilibili`。旧版歌单数据（只有 `bvid`/`cid`）无需迁移即可正常使用。歌单支持混合存放不同平台的歌曲。

### 7. CI/CD 与部署自动化

```
代码推送 → deploy.sh 一键执行：
  ├── 后端 → Docker 构建 → 推送 Hugging Face Spaces
  ├── 前端 → H5 构建 → 推送 GitHub Pages
  └── 推送 main 分支

APK 构建 → GitHub Actions 手动触发：
  ├── Node.js + JDK 21 + Android SDK 环境
  ├── H5 构建 → Capacitor Sync → Gradle assembleRelease
  ├── 固定签名密钥（覆盖安装不丢数据）
  └── APK + h5-bundle.zip 发布到 GitHub Releases
```

**签名管理**：使用固定 keystore 文件签名 APK，确保用户更新时可直接覆盖安装，歌单等本地数据完整保留。

## 技术栈总结

| 层级 | 技术 | 选型理由 |
|------|------|---------|
| 前端框架 | uni-app + Vue 3 | 一套代码多端运行（H5/Android/小程序） |
| 状态管理 | Pinia | Vue 3 官方推荐，TypeScript 友好 |
| 后端框架 | Express | 轻量，适合代理服务 |
| Android 壳 | Capacitor | 比 Cordova 更现代，原生插件开发简单 |
| 原生音频 | Android MediaPlayer | 系统原生，稳定可靠，支持后台 |
| 媒体控制 | Android MediaSession | 系统标准 API，一次集成多处生效 |
| 网易云 API | NeteaseCloudMusicApi | 社区活跃维护，Node.js 原生集成 |
| QQ音乐 API | 自实现 fetch | 无额外依赖，直接调用 QQ 音乐接口 |
| CI/CD | GitHub Actions | 免费，与 GitHub 生态深度集成 |
| 前端托管 | GitHub Pages | 免费，自动 HTTPS |
| 后端托管 | Hugging Face Spaces | 免费，支持 Docker |

## 项目数据

- 前端代码：~4000 行 TypeScript/Vue
- 后端代码：~500 行 TypeScript
- 原生插件：~800 行 Java
- 迭代版本：v1.0 → v3.0，共 3 个大版本
- 支持平台：H5 网页 + Android App
- 音源：网易云音乐 + QQ音乐 + B站

---

## 简历项目经历模板

**JollyMusic - 多平台音源聚合音乐播放器 (https://github.com/JollyTang/JollyMusic)**

全栈开发

**项目介绍**

多平台音源聚合的音乐播放器，支持网易云音乐、QQ音乐搜歌和B站视频音频提取。提供 H5 网页和 Android App 两种客户端，后端为无状态代理服务。项目从 v1.0 迭代至 v3.0，完成了从单一音源到多平台聚合、从纯 WebView 到混合原生架构的演进。

**技术栈**

Vue 3 + TypeScript + Pinia + uni-app + Node.js + Express + Capacitor + Android MediaPlayer + GitHub Actions

**项目详情**

- 多平台音源适配器架构：后端采用策略模式设计统一音源接口，已接入网易云、QQ音乐、B站三个平台。新增平台仅需添加适配器模块，实测 QQ 音乐接入仅改动 85 行代码，验证了架构扩展性
- 混合渲染架构解决后台播放：针对 Android WebView 后台 JS 被系统节流导致歌曲无法连续播放的问题，将播放队列管理和自动切歌逻辑下沉到原生层（Java MediaPlayer），原生层自主完成 URL 获取和播放，WebView 仅负责 UI 渲染和状态同步
- Android 系统级媒体集成：通过自写 Capacitor 原生插件集成 MediaSession + Foreground Service，一次注册实现锁屏控制、通知栏 MediaStyle、蓝牙耳机按键等全部系统媒体入口；自定义音频焦点策略实现与其他 App 音频混合播放
- 无状态后端设计：后端从 v1.0 的 SQLite 有状态服务演进为纯代理架构，歌单数据迁移至客户端 localStorage，后端零存储、支持水平扩展，部署成本降至零（Hugging Face Spaces 免费托管）
- OTA 热更新机制：集成 capacitor-updater 实现前端代码空中更新，App 启动时自动检查 GitHub Releases 并静默下载应用，前端迭代无需用户重新安装 APK
- CI/CD 自动化：GitHub Actions 自动构建 Release APK 并发布到 Releases，使用固定签名密钥确保用户覆盖安装时数据不丢失；一键部署脚本同时部署前端（GitHub Pages）和后端（Hugging Face）
