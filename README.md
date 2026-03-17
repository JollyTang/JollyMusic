# ListenMusic - B站音频播放器

通过输入B站视频的BV号，提取并播放对应视频的音频。支持歌单管理，可部署为H5网页、微信小程序或原生App。

## 技术栈

- **前端**: uni-app + Vue 3 + TypeScript + Pinia
- **后端**: Node.js + Express + TypeScript
- **数据库**: SQLite (better-sqlite3)

## 项目结构

```
ListenMusic/
├── server/     # 后端服务
├── app/        # 前端 uni-app
└── README.md
```

## 快速开始

### 1. 启动后端

```bash
cd server
npm install
npm run dev
```

后端服务将运行在 `http://localhost:3000`

### 2. 启动前端 (H5)

```bash
cd app
npm install
npm run dev:h5
```

前端H5将运行在 `http://localhost:5173`，API请求会自动代理到后端。

### 3. 微信小程序

```bash
cd app
npm run dev:mp-weixin
```

用微信开发者工具打开 `app/dist/dev/mp-weixin` 目录。

## 核心功能

- **BV号搜索**: 输入BV号即可获取视频信息
- **音频播放**: 提取视频音频轨道进行播放
- **分P选择**: 多P视频可选择特定分P播放
- **歌单管理**: 创建歌单、添加/移除曲目
- **播放控制**: 播放/暂停、上一首/下一首、进度拖动
- **播放模式**: 顺序播放、随机播放、单曲循环

## API 接口

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/video/info/:bvid` | GET | 获取视频信息 |
| `/api/video/audio/:bvid/:cid` | GET | 获取音频流地址 |
| `/api/audio/proxy?url=...` | GET | 代理B站音频流 |
| `/api/playlists` | GET/POST | 歌单列表/创建 |
| `/api/playlists/:id` | PUT/DELETE | 修改/删除歌单 |
| `/api/playlists/:id/tracks` | GET/POST/DELETE | 歌单曲目管理 |

## 注意事项

- 音频通过后端代理播放（B站CDN需要特定Referer头）
- 未登录状态下音质为 64K/132K
- 音频流URL有效期约120分钟，过期后自动重新获取
