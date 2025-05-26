# docusaurus-player

一个美观且功能强大的 React 音乐播放器组件，支持歌词显示、播放列表、进度条控制等功能。

## 特性

- 🎵 支持多种播放模式（顺序播放、随机播放、单曲循环）
- 📝 支持歌词显示和同步
- 📱 响应式设计，支持移动端
- 📋 支持播放列表管理
- 🔊 音量控制
- ⌨️ 键盘快捷键支持
- 🎮 支持悬浮球模式
- ⏱️ 播放进度记忆

## 安装

```bash
npm install docusaurus-player@beta
# 或者
yarn add docusaurus-player@beta
# 或者
pnpm add docusaurus-player@beta
```

## 使用

### 快速上手

```jsx
import { MusicPlayer, MusicProvider } from "docusaurus-player";

const songs = [
  {
    name: "歌曲名称", // 或 title
    artist: "艺术家", // 或 author
    url: "音频文件URL",
    cover: "封面图片URL", // 或 pic
    lrc: "歌词内容或URL（可选）",
    theme: "#2196f3", // 可选
  },
  // 更多歌曲...
];

export default function App() {
  return (
    <MusicProvider songs={songs} autoplay={false}>
      <MusicPlayer initialLayout="normal" />
    </MusicProvider>
  );
}
```

### 高级用法

```jsx
import { MusicPlayer, MusicProvider } from "docusaurus-player";

const handlePlay = (song) => { /* ... */ };
const handlePause = () => { /* ... */ };
const handleEnded = () => { /* ... */ };
const handleTimeUpdate = (currentTime, duration) => { /* ... */ };
const handleVolumeChange = (volume) => { /* ... */ };
const handlePlayModeChange = (mode) => { /* ... */ };
const handleLayoutChange = (layout) => { /* ... */ };

<MusicProvider songs={songs} autoplay={true}>
  <MusicPlayer
    initialLayout="normal"
    onPlay={handlePlay}
    onPause={handlePause}
    onEnded={handleEnded}
    onTimeUpdate={handleTimeUpdate}
    onVolumeChange={handleVolumeChange}
    onPlayModeChange={handlePlayModeChange}
    onLayoutChange={handleLayoutChange}
  />
</MusicProvider>
```

## 组件说明

### MusicProvider

`MusicProvider` 是音乐播放器的状态管理组件，负责：

- 维护播放列表数据
- 提供全局的音乐播放状态（当前歌曲、播放进度、音量、播放模式等）
- 管理播放器的核心状态
- 确保多个 MusicPlayer 实例共享相同的播放状态

Props:
| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| songs | 播放列表 | Song[] | [] |
| autoplay | 是否自动播放 | boolean | false |

### MusicPlayer

`MusicPlayer` 是音乐播放器的 UI 组件，负责：

- 渲染播放器界面
- 处理用户交互
- 管理播放器的展示状态
- 通过 MusicProvider 共享播放状态

Props:
| 参数 | 说明 | 类型 | 默认值 |
| ---------------- | -------------------- | ----------------------------------------- | -------- |
| initialLayout | 初始布局模式 | 'normal' \| 'floating' | 'normal' |
| onPlay | 开始播放回调 | (song: Song) => void | |
| onPause | 暂停播放回调 | () => void | |
| onEnded | 播放结束回调 | () => void | |
| onTimeUpdate | 进度更新回调 | (currentTime: number, duration: number) | |
| onVolumeChange | 音量变化回调 | (volume: number) => void | |
| onPlayModeChange | 播放模式变化回调 | (mode: 'list' \| 'random' \| 'single') | |
| onLayoutChange | 布局变化回调 | (layout: 'normal' \| 'floating') | |

歌曲数据结构（Song）
| 字段 | 说明 | 类型 | 备注 |
| ------- | -------------- | -------- | ------------------- |
| name | 歌曲名 | string | 或 title |
| artist | 艺术家 | string | 或 author |
| url | 音频文件地址 | string | 必填 |
| cover | 封面图片地址 | string | 或 pic |
| lrc | 歌词内容/URL | string | 可选 |
> name/title、artist/author、cover/pic 字段任选其一即可。

### 键盘快捷键

| 快捷键 | 功能              |
| ------ | ----------------- |
| Space  | 播放/暂停         |
| →      | 下一首            |
| ←      | 上一首            |
| ↑      | 增加音量          |
| ↓      | 减少音量          |
| M      | 静音/取消静音     |
| L      | 切换播放模式      |
| P      | 显示/隐藏播放列表 |
| F      | 切换布局模式      |

## 更新日志

## 许可证

MIT
