# JollyMusic - 多平台音乐播放器

聚合多平台音源的音乐播放器，支持网易云音乐、QQ音乐搜歌和B站视频音频提取。可部署为 H5 网页或 Android App。

## 快速体验

在线体验：**https://jollytang.github.io/JollyMusic/**

Android APK 下载：[GitHub Releases](https://github.com/JollyTang/JollyMusic/releases)

## 功能特性

- **网易云音乐** — 搜索歌名/歌手，直接播放（标准音质免登录，VIP 歌曲自动标记）
- **QQ音乐** — 搜索歌名/歌手，直接播放（标准音质免登录，VIP 歌曲自动标记）
- **B站音频** — 输入BV号提取视频音频，支持多P选择
- **智能搜索** — 输入BV号自动识别走B站，输入歌名走当前选中平台
- **歌单管理** — 创建/重命名/删除歌单，支持混合存放不同平台的歌曲
- **播放控制** — 播放/暂停、上下曲、进度拖动、顺序/随机/单曲循环
- **播放队列** — 拖拽排序、下一首播放、队列管理
- **分享码** — 歌单生成分享码，发给朋友一键导入
- **Android App** — Capacitor 打包，支持后台播放、锁屏/通知栏媒体控制
- **OTA 热更新** — 前端更新自动推送，无需重新下载 APK

## 技术栈

- **前端**: uni-app + Vue 3 + TypeScript + Pinia
- **后端**: Node.js + Express + TypeScript + NeteaseCloudMusicApi
- **Android**: Capacitor + 原生 MediaPlayer + MediaSession
- **存储**: 歌单数据存储在客户端本地 (localStorage)
- **部署**: GitHub Pages (前端) + Hugging Face Spaces (后端) + GitHub Actions (APK 构建)

## 项目结构

```
JollyMusic/
├── server/          # 后端代理服务 (B站/网易云/QQ音乐 API 代理)
│   └── src/
│       ├── bilibili/    # B站音频适配器
│       ├── netease/     # 网易云音乐适配器
│       ├── qqmusic/     # QQ音乐适配器
│       └── routes/      # API 路由
├── app/             # 前端 uni-app (H5 / Android)
│   ├── src/             # 前端源码
│   └── android/         # Capacitor Android 工程
├── .github/workflows/   # GitHub Actions (APK 自动构建)
├── deploy.sh        # 一键部署脚本
├── dev.sh           # 本地开发启动脚本
└── ROADMAP.md       # 需求追踪与版本规划
```

## 快速开始

### 一键启动（推荐）

```bash
./dev.sh
```

同时启动前端和后端，浏览器访问 `http://localhost:5173`。

### 手动启动

```bash
# 后端
cd server && npm install && npm run dev

# 前端（另一个终端）
cd app && npm install && npm run dev:h5
```

手机测试：确保手机与电脑在同一局域网，访问 `http://电脑IP:5173`

## 后端 API

后端是无状态代理服务，不存储任何用户数据。

| 路由 | 功能 |
|------|------|
| `GET /api/music/search?keyword=&platform=` | 搜索歌曲（netease / qq） |
| `GET /api/music/url/:platform/:id` | 获取歌曲播放 URL |
| `GET /api/video/info/:bvid` | 获取B站视频信息 |
| `GET /api/video/audio/:bvid/:cid` | 获取B站音频流地址 |
| `GET /api/audio/proxy?url=` | 代理音频流 |
| `GET /api/audio/image?url=` | 代理B站封面图片 |
| `GET /api/health` | 健康检查 |

## 部署

```bash
./deploy.sh
```

自动部署后端到 Hugging Face Spaces，前端到 GitHub Pages。

如需构建 Android APK，请前往 GitHub Actions 手动触发 Build APK workflow。

## 版本记录

### v3.0.0
- 接入网易云音乐：搜索歌名直接播放，VIP 歌曲标记
- 接入 QQ 音乐：搜索歌名直接播放，VIP 歌曲标记
- 搜索页平台切换 Tab（网易云 / QQ音乐 / B站），智能 BV号识别
- Track 数据模型支持多平台 (source 字段)，歌单可混合存放
- 后端音源适配器架构，易于扩展新平台

### v2.1.0
- Android APK 打包 (Capacitor)
- 原生音频播放，支持后台播放和与其他 App 混合播放
- 锁屏/通知栏媒体控制 (MediaSession)
- OTA 热更新，前端更新自动推送
- 歌单封面显示、重命名、拖拽排序

### v1.2.0
- 部署上线：GitHub Pages + Hugging Face Spaces
- 一键部署脚本 (deploy.sh)

### v1.1.0
- 歌单存储迁移到客户端本地，后端变为无状态代理
- 歌单分享码功能

### v1.0.0
- 基础播放功能：BV号搜索、音频播放、分P选择
- 歌单管理、播放控制、播放队列

## 开发规划

详见 [ROADMAP.md](ROADMAP.md)
