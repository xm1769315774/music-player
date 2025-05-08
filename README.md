# docusaurus-player

一个美观且功能强大的React音乐播放器组件，支持歌词显示、播放列表、进度条控制等功能。

## 特性

- 🎵 支持多种播放模式（顺序播放、随机播放、单曲循环）
- 📝 支持歌词显示和同步
- 📱 响应式设计，支持移动端
- 🎨 可自定义主题颜色
- 📋 支持播放列表管理
- �� 音量控制
- ⌨️ 键盘快捷键支持
- 🎮 支持悬浮球模式
- ⏱️ 播放进度记忆
- 📊 播放历史记录
- ⚡ 播放速度控制

## 安装

```bash
npm install docusaurus-player@beta
# 或者
yarn add docusaurus-player@beta
# 或者
pnpm add docusaurus-player@beta
```

## 使用

### 基础用法

```jsx
import { MusicPlayer, MusicProvider } from 'docusaurus-player';

const App = () => {
  const playlist = [
    {
      name: '歌曲名称',
      artist: '艺术家',
      url: '音频文件URL',
      cover: '封面图片URL',
      lrc: '歌词字符串（可选）',
      theme: '主题颜色（可选）'
    }
    // 更多歌曲...
  ];

  return (
    <MusicProvider>
      <MusicPlayer
        audio={playlist}
        autoplay={false}
        mini={false}
        fixed={false}
        listFolded={false}
        listMaxHeight="24rem"
        theme="#2196f3"
        preload="auto"
        loop="all"
        order="list"
      />
    </MusicProvider>
  );
};

export default App;
```

### 高级用法

```jsx
import { MusicPlayer, MusicProvider } from 'docusaurus-player';

const App = () => {
  const playlist = [
    {
      name: '歌曲名称',
      artist: '艺术家',
      url: '音频文件URL',
      cover: '封面图片URL',
      lrc: '歌词字符串',
      theme: '#2196f3'
    }
  ];

  const handlePlay = (song) => {
    console.log('开始播放:', song);
  };

  const handlePause = () => {
    console.log('暂停播放');
  };

  const handleEnded = () => {
    console.log('播放结束');
  };

  const handleTimeUpdate = (currentTime, duration) => {
    console.log('播放进度:', currentTime, duration);
  };

  const handleVolumeChange = (volume) => {
    console.log('音量变化:', volume);
  };

  const handlePlayModeChange = (mode) => {
    console.log('播放模式变化:', mode);
  };

  const handleLayoutChange = (layout) => {
    console.log('布局变化:', layout);
  };

  return (
    <MusicProvider>
      <MusicPlayer
        audio={playlist}
        autoplay={true}
        initialLayout="floating"
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onVolumeChange={handleVolumeChange}
        onPlayModeChange={handlePlayModeChange}
        onLayoutChange={handleLayoutChange}
      />
    </MusicProvider>
  );
};

export default App;
```

## API

### MusicPlayer Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| audio | 播放列表 | Array | [] |
| mini | 是否开启迷你模式 | boolean | false |
| fixed | 是否固定模式 | boolean | false |
| listFolded | 播放列表是否折叠 | boolean | false |
| listMaxHeight | 播放列表最大高度 | string/number | 24rem |
| theme | 主题颜色 | string | #2196f3 |
| autoplay | 是否自动播放 | boolean | false |
| loop | 循环模式 | 'all' / 'one' / 'none' | 'all' |
| order | 播放顺序 | 'list' / 'random' | 'list' |
| preload | 音频预加载模式 | 'auto' / 'metadata' / 'none' | 'auto' |
| initialLayout | 初始布局模式 | 'normal' / 'floating' | 'normal' |

### 回调函数

| 参数 | 说明 | 类型 |
| --- | --- | --- |
| onPlay | 开始播放时触发 | (song: Song) => void |
| onPause | 暂停播放时触发 | () => void |
| onEnded | 播放结束时触发 | () => void |
| onTimeUpdate | 播放进度更新时触发 | (currentTime: number, duration: number) => void |
| onVolumeChange | 音量变化时触发 | (volume: number) => void |
| onPlayModeChange | 播放模式变化时触发 | (mode: PlayMode) => void |
| onLayoutChange | 布局模式变化时触发 | (layout: ControlLayout) => void |

### 键盘快捷键

| 快捷键 | 功能 |
| --- | --- |
| Space | 播放/暂停 |
| → | 下一首 |
| ← | 上一首 |
| ↑ | 增加音量 |
| ↓ | 减少音量 |
| M | 静音/取消静音 |
| L | 切换播放模式 |
| P | 显示/隐藏播放列表 |
| F | 切换布局模式 |

### audio 数组项属性

| 参数 | 说明 | 类型 | 必填 |
| --- | --- | --- | --- |
| name | 音频名称 | string | 是 |
| artist | 艺术家 | string | 是 |
| url | 音频文件地址 | string | 是 |
| cover | 封面图片地址 | string | 是 |
| lrc | 歌词字符串 | string | 否 |
| theme | 音频对应的主题色 | string | 否 |

## 更新日志

### 1.0.0-beta.8

- 添加键盘快捷键支持
- 添加播放进度记忆功能
- 添加播放历史记录功能
- 添加播放速度控制功能
- 优化悬浮球模式交互体验
- 修复类型比较问题
- 完善文档和示例

### 1.0.0-beta.7

- 优化构建配置，移除手动引入样式文件的步骤
- 改进组件打包方式，提供更好的开发体验
- 更新文档，简化使用方法

### 1.0.0-beta.6

- 优化移动端交互体验
- 修复歌词同步问题
- 改进播放列表样式
- 添加错误重试机制
- 优化音频加载性能

## 许可证

MIT
