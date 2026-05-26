# DevPilot

> 开发者日常工具集合平台 —— 一站式解决文本处理、格式转换、脚本管理等高频开发需求。

## 功能概览

| 模块 | 说明 |
|------|------|
| 文本对比 | 基于 Monaco Editor 的双栏 Diff 对比，支持语法高亮 |
| 图片转文字 (OCR) | 上传图片调用 OCR 服务提取文本内容 |
| 文本工具 | 批量字符串处理、Base64 编解码、时间戳转换、JSON/YAML 互转 |
| Crontab | 可视化 Cron 表达式编辑器，支持中文描述和未来执行时间预览 |
| 脚本管理 | Shell / Ansible 脚本的在线查看、编辑、创建与删除 |

## 技术栈

- **前端**: React 19 + TypeScript + Vite + Ant Design 6
- **后端**: Express 5 + TypeScript (tsx)
- **编辑器**: Monaco Editor (代码高亮、Diff)
- **工具库**: dayjs, cron-parser, cronstrue, js-yaml, uuid

## 项目结构

```
├── src/
│   ├── components/        # 通用组件 (Layout)
│   ├── pages/
│   │   ├── TextDiff/      # 文本对比
│   │   ├── OCR/           # 图片转文字
│   │   ├── TextTools/     # 文本工具 (Base64, JSON/YAML, 时间戳, 批量处理)
│   │   ├── Crontab/       # Cron 表达式解析
│   │   └── Scripts/       # 脚本管理
│   └── utils/             # 工具函数
├── server/
│   ├── index.ts           # Express 入口
│   └── routes/
│       ├── ocr.ts         # OCR 代理接口
│       └── files.ts       # 脚本文件 CRUD 接口
├── public/                # 静态资源
└── dist/                  # 构建产物
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 启动开发环境

前端开发服务器：

```bash
npm run dev
```

后端 API 服务器：

```bash
npm run dev:server
```

前端默认运行在 `http://localhost:5173`，后端运行在 `http://localhost:3001`。

### 构建生产版本

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

### 代码检查

```bash
npm run lint
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 后端服务监听端口 |
| `SCRIPTS_DIR` | `./scripts-data` | 脚本文件存储目录 |
| `OCR_SERVICE_URL` | `http://localhost:8080/ocr` | OCR 服务地址 |

## API 接口

### OCR

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ocr` | 上传图片进行文字识别 (multipart/form-data) |

### 脚本管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/scripts` | 获取所有脚本列表 |
| GET | `/api/scripts/:category/:filename` | 获取单个脚本内容 |
| POST | `/api/scripts/:category` | 创建新脚本 |
| PUT | `/api/scripts/:category/:filename` | 更新脚本内容/重命名 |
| DELETE | `/api/scripts/:category/:filename` | 删除脚本 |

支持的脚本分类：`shell`、`ansible`

## 开发说明

- 前端使用 Vite 热更新，修改代码后自动刷新
- 后端使用 tsx watch 模式，修改后自动重启
- 支持亮色/暗色主题切换
- 侧边栏可折叠，响应式布局

## License

MIT
