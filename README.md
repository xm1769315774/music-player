# docusaurus-player

一个美观且功能强大的React音乐播放器组件，支持歌词显示、播放列表、进度条控制等功能。

## 特性

- 🎵 支持多种播放模式（顺序播放、随机播放、单曲循环）
- 📝 支持歌词显示和同步
- 📱 响应式设计，支持移动端
- 🎨 可自定义主题颜色
- 📋 支持播放列表管理
- 🔊 音量控制
- ⌨️ 键盘快捷键支持

## 安装

```bash
npm install docusaurus-player@beta
# 或者
yarn add docusaurus-player@beta
# 或者
pnpm add docusaurus-player@beta
```

## 使用

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
