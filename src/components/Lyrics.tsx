import React, { useRef, useState, useEffect, TouchEvent } from 'react';

interface LyricsProps {
  lrc: string;
  currentTime: number;
  className?: string;
  onSeek?: (time: number) => void;
}

interface LyricLine {
  time: number;
  text: string;
}

export const Lyrics: React.FC<LyricsProps> = ({ lrc, currentTime, className = '', onSeek }) => {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [touchStartX, setTouchStartX] = useState(0);
  const [lastInteractionTime, setLastInteractionTime] = useState(0);
  const lyricsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parseLyrics = (lrcString: string): LyricLine[] => {
      const lines = lrcString.split('\n');
      const timeRegex = /\[([0-9:.]+)\]/;
      const parsedLyrics: LyricLine[] = [];

      lines.forEach(line => {
        const match = timeRegex.exec(line);
        if (match) {
          const timeStr = match[1];
          const text = line.replace(timeRegex, '').trim();
          if (text) {
            const [minutes, seconds] = timeStr.split(':');
            const time = parseFloat(minutes) * 60 + parseFloat(seconds);
            parsedLyrics.push({ time, text });
          }
        }
      });

      return parsedLyrics.sort((a, b) => a.time - b.time);
    };

    fetch(lrc)
      .then(response => response.text())
      .then(text => {
        setLyrics(parseLyrics(text));
      })
      .catch(console.error);
  }, [lrc]);

  useEffect(() => {
    const now = Date.now();
    if (now - lastInteractionTime > 5000) { // 5秒无操作后自动同步
      const index = lyrics.findIndex((lyric, index) => {
        const nextLyric = lyrics[index + 1];
        return currentTime >= lyric.time && (!nextLyric || currentTime < nextLyric.time);
      });

      if (index !== currentIndex) {
        setCurrentIndex(index);
        if (lyricsRef.current && index !== -1) {
          const lineElements = lyricsRef.current.children[0].children;
          if (lineElements[index]) {
            const container = lyricsRef.current;
            const targetElement = lineElements[index] as HTMLElement;
            const containerRect = container.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();

            // 计算目标元素相对于容器的位置
            const scrollTop = targetElement.offsetTop - container.offsetTop - (containerRect.height / 2) + (targetRect.height / 2);

            // 使用 scrollTo 进行平滑滚动
            container.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });
          }
        }
      }
    }
  }, [currentTime, lyrics, currentIndex, lastInteractionTime]);

  const handleLyricClick = (time: number) => {
    if (onSeek) {
      onSeek(time);
      setLastInteractionTime(Date.now());
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;

    // 触发自定义事件，在父组件中处理视图切换
    if (Math.abs(deltaX) > 50) {
      const event = new CustomEvent('viewChange', {
        detail: { direction: deltaX > 0 ? 'right' : 'left' }
      });
      window.dispatchEvent(event);
    }
  };

  return (
    <div
      ref={lyricsRef}
      className={`overflow-y-auto h-full max-h-[calc(100vh-300px)] md:max-h-full ${className}`}
      style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="py-4 space-y-4 overflow-hidden">
        {lyrics.map((lyric, index) => (
          <div
            key={`${lyric.time}-${index}`}
            className={`text-center transition-all duration-300 cursor-pointer px-2
              ${index === currentIndex ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 text-lg font-bold scale-105' : 'text-[#8A8A9A] text-base hover:text-primary'}`}
            onClick={() => handleLyricClick(lyric.time)}
          >
            {lyric.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Lyrics;