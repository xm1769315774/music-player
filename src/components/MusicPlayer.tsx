import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { ChangeEvent, MouseEvent, TouchEvent } from 'react';
import ProgressBar from './ProgressBar';
import VolumeControl from './VolumeControl';
import Lyrics from './Lyrics';
import { useMusicContext, PlayMode, ControlLayout } from '@/contexts/MusicContext';
import defaultCover from '@/assets/default-cover.jpg';

interface MusicPlayerProps {
  audio?: {
    name: string;
    artist: string;
    url: string;
    cover: string;
    lrc?: string;
    theme?: string;
  }[];
  mini?: boolean;
  fixed?: boolean;
  listFolded?: boolean;
  listMaxHeight?: number | string;
  theme?: string;
  autoplay?: boolean;
  mutex?: boolean;
  loop?: 'all' | 'one' | 'none';
  order?: 'list' | 'random';
  preload?: 'auto' | 'metadata' | 'none';
  initialLayout?: ControlLayout;
  onPlay?: (song: { name: string; artist: string; url: string; cover: string }) => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onVolumeChange?: (volume: number) => void;
  onPlayModeChange?: (mode: PlayMode) => void;
  onLayoutChange?: (layout: ControlLayout) => void;
}

export type { MusicPlayerProps };

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  autoplay = false,
  listMaxHeight = '24rem',
  initialLayout = 'normal',
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onVolumeChange,
  onPlayModeChange,
  onLayoutChange
}) => {
  const formatTime = (time: number): string => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const {
    state,
    dispatch,
    audioRef,
    togglePlay,
    playNext,
    playPrev,
    handleSeek,
    handleVolumeChange,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    switchToSong,
    retryPlay,
    togglePlayMode: togglePlayModeFromContext
  } = useMusicContext();

  const {
    playlist: audio,
    currentIndex,
    playing,
    currentTime,
    duration,
    volume,
    playMode,
    showPlaylist,
    currentView,
    controlLayout
  } = state;

  const isFirstLoadRef = useRef(true);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50;
    const diff = touchEndX.current - touchStartX.current;
    if (Math.abs(diff) > swipeThreshold) {
      dispatch({
        type: 'SET_CURRENT_VIEW',
        payload: diff > 0 ? 'lyrics' : 'cover'
      });
    }
  };

  const generateRandomOrder = useCallback((length: number): number[] => {
    const array = Array.from({ length }, (_, i) => i);
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }, []);

  const togglePlayMode = useCallback(() => {
    const newMode = playMode === 'single' ? 'random' : playMode === 'random' ? 'list' : 'single';
    dispatch({
      type: 'SET_PLAY_MODE',
      payload: newMode
    });
    // 切换到随机播放模式时，立即生成新的随机顺序
    if (newMode === 'random') {
      dispatch({
        type: 'SET_RANDOM_ORDER',
        payload: generateRandomOrder(audio.length)
      });
    }
    // 触发回调
    if (onPlayModeChange) {
      onPlayModeChange(newMode);
    }
  }, [playMode, dispatch, audio.length, generateRandomOrder, onPlayModeChange]);

  // 在播放列表更新时重新生成随机顺序
  useEffect(() => {
    if (playMode === 'random') {
      dispatch({
        type: 'SET_RANDOM_ORDER',
        payload: generateRandomOrder(audio.length)
      });
    }
  }, [playMode, audio.length, dispatch, generateRandomOrder]);

  const togglePlaylist = useCallback(() => {
    dispatch({ type: 'TOGGLE_PLAYLIST' });
  }, [dispatch]);

  const isNormalLayout = controlLayout === 'normal';
  const isFloatingLayout = controlLayout === 'floating';

  const toggleControlLayout = useCallback(() => {
    const newLayout = isNormalLayout ? 'floating' : 'normal';
    // 切换布局时重置相关状态
    dispatch({ type: 'SET_CONTROL_LAYOUT', payload: newLayout });
    dispatch({ type: 'TOGGLE_PLAYLIST', payload: false }); // 关闭播放列表
    setIsFloatingControlExpanded(false); // 关闭悬浮控制面板的展开状态
    if (onLayoutChange) {
      onLayoutChange(newLayout);
    }
  }, [isNormalLayout, dispatch, onLayoutChange]);

  const [isFloatingControlExpanded, setIsFloatingControlExpanded] = useState(false);

  const toggleFloatingControl = useCallback(() => {
    setIsFloatingControlExpanded(prev => !prev);
  }, []);

  useEffect(() => {
    const handleViewChange = (e: CustomEvent<{ direction: 'left' | 'right' }>) => {
      dispatch({
        type: 'SET_CURRENT_VIEW',
        payload: e.detail.direction === 'left' ? 'lyrics' : 'cover'
      });
    };

    window.addEventListener('viewChange', handleViewChange as EventListener);
    return () => window.removeEventListener('viewChange', handleViewChange as EventListener);
  }, [dispatch]);

  const handleOutsideClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      dispatch({ type: 'TOGGLE_PLAYLIST' });
    }
  }, [dispatch]);

  const handleSongSelect = useCallback((index: number) => {
    if (!state.loading) {
      dispatch({ type: 'SET_ERROR', payload: null });
      switchToSong(index);
    }
  }, [switchToSong, state.loading, dispatch]);

  const [position, setPosition] = useState({ x: 16, y: window.innerHeight - 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; dragged: boolean }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    dragged: false
  });

  // 添加设备类型检测
  const isMobile = useCallback(() => {
    return window.innerWidth <= 768;
  }, []);

  // 获取合适的初始位置
  const getInitialPosition = useCallback(() => {
    const savedPosition = localStorage.getItem('floatingBallPosition');
    if (savedPosition) {
      const { x, y, screenWidth, screenHeight } = JSON.parse(savedPosition);
      const currentScreenWidth = window.innerWidth;
      const currentScreenHeight = window.innerHeight;

      // 如果屏幕尺寸变化超过阈值，或者设备类型发生变化，则使用新的默认位置
      if (
        Math.abs(currentScreenWidth - screenWidth) > 100 ||
        Math.abs(currentScreenHeight - screenHeight) > 100 ||
        isMobile() !== (screenWidth <= 768)
      ) {
        return getDefaultPosition();
      }

      // 确保位置在可视区域内
      return {
        x: Math.min(Math.max(x, 0), currentScreenWidth - 80),
        y: Math.min(Math.max(y, 0), currentScreenHeight - 80)
      };
    }
    return getDefaultPosition();
  }, [isMobile]);

  // 获取默认位置
  const getDefaultPosition = useCallback(() => {
    const padding = 16;
    const ballSize = 64;
    const bottomPadding = 80;

    if (isMobile()) {
      // 移动端默认位置：左下角
      return {
        x: padding,
        y: window.innerHeight - ballSize - bottomPadding
      };
    } else {
      // PC端默认位置：左下角
      return {
        x: padding,
        y: window.innerHeight - ballSize - bottomPadding
      };
    }
  }, [isMobile]);

  // 保存位置到 localStorage
  useEffect(() => {
    const savePosition = () => {
      localStorage.setItem('floatingBallPosition', JSON.stringify({
        ...position,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight
      }));
    };

    window.addEventListener('beforeunload', savePosition);
    return () => {
      window.removeEventListener('beforeunload', savePosition);
    };
  }, [position]);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (controlLayout === 'floating') {
        const newPosition = getInitialPosition();
        setPosition(newPosition);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [controlLayout, getInitialPosition]);

  // 初始化位置
  useEffect(() => {
    if (controlLayout === 'floating') {
      setPosition(getInitialPosition());
    }
  }, [controlLayout, getInitialPosition]);

  // 处理拖拽开始
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    dragRef.current.dragged = false;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragRef.current = {
      ...dragRef.current,
      startX: clientX,
      startY: clientY,
      initialX: position.x,
      initialY: position.y
    };
  }, [position]);

  // 处理拖拽过程
  const handleDrag = useCallback((e: MouseEvent<Element> | TouchEvent<Element>) => {
    if (!isDragging) return;
    if ('buttons' in e && e.buttons === 0) {
      handleDragEnd();
      return;
    }
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - dragRef.current.startX;
    const deltaY = clientY - dragRef.current.startY;
    // 只有移动距离大于5像素才认为是拖拽
    if (!dragRef.current.dragged && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      dragRef.current.dragged = true;
    }
    const newX = Math.min(Math.max(dragRef.current.initialX + deltaX, 0), window.innerWidth - 80);
    const newY = Math.min(Math.max(dragRef.current.initialY + deltaY, 0), window.innerHeight - 80);
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  // 处理拖拽结束
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragRef.current.dragged = false;
  }, []);

  // 添加和移除事件监听
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: Event) => {
        if (e instanceof MouseEvent) {
          const mouseEvent = e as unknown as MouseEvent<Element>;
          handleDrag(mouseEvent);
        }
      };
      const handleTouchMove = (e: Event) => {
        if (e instanceof TouchEvent) {
          const touchEvent = e as unknown as TouchEvent<Element>;
          handleDrag(touchEvent);
        }
      };
      const handleMouseUp = () => handleDragEnd();
      const handleTouchEnd = () => handleDragEnd();

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleTouchEnd);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleDrag, handleDragEnd]);

  // 支持外部动态传入歌曲列表
  useEffect(() => {
    dispatch({ type: 'SET_PLAYLIST', payload: audio });
    // 可选：重置当前播放索引和时间
    dispatch({ type: 'SET_CURRENT_INDEX', payload: 0 });
    dispatch({ type: 'SET_CURRENT_TIME', payload: 0 });
  }, [audio, dispatch]);

  useEffect(() => {
    if (initialLayout) {
      dispatch({ type: 'SET_CONTROL_LAYOUT', payload: initialLayout });
    }
  }, [initialLayout, dispatch]);

  useEffect(() => {
    if (autoplay && audioRef.current) {
      audioRef.current.play().catch(error => {
        console.error('Autoplay failed:', error);
      });
    }
  }, [autoplay]);

  const handleEndedWithCallback = useCallback(() => {
    handleEnded();
    if (onEnded) {
      onEnded();
    }
  }, [handleEnded, onEnded]);

  const handleTimeUpdateWithCallback = useCallback(() => {
    handleTimeUpdate();
    if (onTimeUpdate && audioRef.current) {
      onTimeUpdate(audioRef.current.currentTime, audioRef.current.duration);
    }
  }, [handleTimeUpdate, onTimeUpdate, audioRef]);

  const handleVolumeChangeWithCallback = useCallback((volumeOrEvent: number | ChangeEvent<HTMLInputElement>) => {
    handleVolumeChange(volumeOrEvent);
    if (onVolumeChange) {
      const volume = typeof volumeOrEvent === 'number' ? volumeOrEvent : parseFloat(volumeOrEvent.target.value);
      onVolumeChange(volume);
    }
  }, [handleVolumeChange, onVolumeChange]);

  const handlePlayClick = useCallback(() => {
    togglePlay();
    if (state.playing) {
      onPause?.();
    } else {
      onPlay?.(state.playlist[state.currentIndex]);
    }
  }, [togglePlay, state.playing, onPause, onPlay, state.playlist, state.currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayClick();
          break;
        case 'ArrowRight':
          e.preventDefault();
          playNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          playPrev();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChangeWithCallback(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChangeWithCallback(Math.max(0, volume - 0.1));
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          handleVolumeChangeWithCallback(volume === 0 ? 0.7 : 0);
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          togglePlayMode();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          togglePlaylist();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleControlLayout();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayClick, playNext, playPrev, handleVolumeChangeWithCallback, volume, togglePlayMode, togglePlaylist, toggleControlLayout]);

  useEffect(() => {
    // 保存播放进度到 localStorage
    const saveProgress = () => {
      if (audioRef.current) {
        localStorage.setItem('musicPlayerProgress', JSON.stringify({
          currentTime: audioRef.current.currentTime,
          currentIndex,
          volume
        }));
      }
    };

    // 加载保存的播放进度
    const loadProgress = () => {
      const savedProgress = localStorage.getItem('musicPlayerProgress');
      if (savedProgress && audioRef.current && isFirstLoadRef.current) {
        const { currentTime, currentIndex: savedIndex, volume: savedVolume } = JSON.parse(savedProgress);
        if (savedIndex === currentIndex) {
          audioRef.current.currentTime = currentTime;
          handleVolumeChangeWithCallback(savedVolume);
        }
        isFirstLoadRef.current = false; // 标记已经不是首次加载
      }
    };

    window.addEventListener('beforeunload', saveProgress);
    loadProgress();

    return () => {
      window.removeEventListener('beforeunload', saveProgress);
    };
  }, [currentIndex, handleVolumeChangeWithCallback]);

  useEffect(() => {
    // 保存播放历史到 localStorage
    const saveHistory = () => {
      const history = JSON.parse(localStorage.getItem('musicPlayerHistory') || '[]');
      const currentSong = state.playlist[currentIndex];
      const newHistory = [
        {
          name: currentSong.name,
          artist: currentSong.artist,
          url: currentSong.url,
          cover: currentSong.cover,
          timestamp: Date.now()
        },
        ...history
      ].slice(0, 50); // 最多保存50条记录

      localStorage.setItem('musicPlayerHistory', JSON.stringify(newHistory));
    };

    if (playing) {
      saveHistory();
    }
  }, [currentIndex, playing, state.playlist]);

  const [imageLoadError, setImageLoadError] = useState<{ [key: string]: boolean }>({});
  const defaultCoverUrl = defaultCover;

  const handleImageError = useCallback((coverUrl: string) => {
    if (coverUrl && coverUrl !== defaultCoverUrl) {
      setImageLoadError(prev => {
        if (prev[coverUrl]) return prev;
        return {
          ...prev,
          [coverUrl]: true
        };
      });
    }
  }, []);

  const getImageSrc = useCallback((coverUrl: string) => {
    if (!coverUrl || imageLoadError[coverUrl]) {
      return defaultCoverUrl;
    }
    return coverUrl;
  }, [imageLoadError]);

  useEffect(() => {
    if (audioRef.current) {
      const handleTimeUpdate = () => handleTimeUpdateWithCallback();
      const handleEnded = () => handleEndedWithCallback();
      const handleLoaded = () => handleLoadedMetadata();

      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('ended', handleEnded);
      audioRef.current.addEventListener('loadedmetadata', handleLoaded);

      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
          audioRef.current.removeEventListener('ended', handleEnded);
          audioRef.current.removeEventListener('loadedmetadata', handleLoaded);
        }
      };
    }
  }, [audioRef, handleTimeUpdateWithCallback, handleEndedWithCallback, handleLoadedMetadata]);

  // 添加悬浮模式按钮的样式
  const floatingButtonStyle = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 1000,
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    border: 'none',
    outline: 'none',
    padding: 0,
    fontSize: '20px'
  } as const;

  const floatingButtonHoverStyle = {
    ...floatingButtonStyle,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    transform: 'scale(1.1)'
  } as const;

  const [isHovered, setIsHovered] = useState(false);


  return (
    <div className={`music-player ${controlLayout}`}>
      <div className={`${isFloatingLayout ? 'hidden' : 'block'}`}>
        <div className="flex flex-col p-4 space-y-4">
          <div
            className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 h-[300px] md:h-[400px]"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className={`h-full w-full ${currentView === 'lyrics' ? 'hidden md:block' : 'block'}`}>
              <div className="relative h-full rounded-lg overflow-hidden transition-opacity duration-300">
                {state.loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                  </div>
                )}
                {state.error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                    <div className="text-red-500 text-center p-4">
                      <p>{state.error}</p>
                      <button
                        onClick={retryPlay}
                        className="mt-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                      >
                        重试
                      </button>
                    </div>
                  </div>
                )}
                <div className="relative w-full h-full">
                  <img
                    src={getImageSrc(audio[currentIndex]?.cover)}
                    alt="Album Cover"
                    className="w-full h-full object-cover rounded-lg img-1"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = defaultCoverUrl;
                      handleImageError(audio[currentIndex]?.cover);
                    }}
                    loading="lazy"
                  />
                  {/* 添加一个默认背景，当图片加载失败时显示 */}
                  <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat rounded-lg"
                    style={{
                      backgroundImage: `url(${defaultCoverUrl})`,
                      opacity: imageLoadError[audio[currentIndex]?.cover] ? 1 : 0
                    }}
                  />
                </div>
              </div>
            </div>
            <div className={`h-full w-full ${currentView === 'lyrics' ? 'block' : 'hidden md:block'}`}>
              <Lyrics
                lrc={audio[currentIndex]?.lrc || ''}
                currentTime={currentTime}
                onSeek={handleSeek}
                className="h-full"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">{audio[currentIndex]?.name}</h2>
                <p className="text-sm text-[#8A8A9A]">{audio[currentIndex]?.artist}</p>
              </div>
            </div>

            <ProgressBar
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
            />

            <div className="flex items-center justify-between px-4">
              <div className="flex items-center justify-center space-x-3 md:space-x-6 flex-wrap md:flex-nowrap overflow-x-auto">
                <button
                  className="text-[#8A8A9A] hover:bg-gradient-to-r from-purple-500 to-pink-500 hover:text-white transition-colors p-2 rounded-full block focus:outline-none focus:ring-2 focus:ring-purple-500 active:scale-95 transform w-10 h-10 md:w-12 md:h-12 flex items-center justify-center"
                  onClick={togglePlayMode}
                  aria-label="Toggle play mode"
                  disabled={state.loading}
                  title={playMode === 'list' ? '列表循环' : playMode === 'random' ? '随机播放' : '单曲循环'}
                >
                  {playMode === 'list' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : playMode === 'random' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      <circle cx="12" cy="12" r="3" fill="currentColor" />
                    </svg>
                  )}
                </button>
                <button
                  className="text-[#A0A0A0] hover:bg-gradient-to-r from-purple-500 to-pink-500 hover:text-white transition-colors p-2 rounded-full block w-10 h-10 md:w-12 md:h-12 flex items-center justify-center"
                  onClick={playPrev}
                  aria-label="Previous track"
                  disabled={state.loading}
                  title="上一首"
                >
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6">
                    <path d="M30 36L18 24L30 12V36Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="16" y1="12" x2="16" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  className={`p-2 rounded-full relative ${state.loading ? 'opacity-50 cursor-not-allowed' : ''} w-12 h-12 md:w-16 md:h-16 flex items-center justify-center`}
                  onClick={handlePlayClick}
                  aria-label={playing ? 'Pause' : 'Play'}
                  disabled={state.loading}
                  style={{ background: 'linear-gradient(135deg, #BF6AFF 0%, #7258F5 100%)' }}
                >
                  {state.loading ? (
                    <div className="animate-spin h-6 w-6 md:h-8 md:w-8">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : playing ? (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-8 md:w-8">
                      <circle cx="24" cy="24" r="22" fill="url(#grad)" stroke="url(#grad)" strokeWidth="2" />
                      <line x1="20" y1="16" x2="20" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      <line x1="28" y1="16" x2="28" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="grad" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#BF6AFF" />
                          <stop offset="1" stopColor="#7258F5" />
                        </linearGradient>
                      </defs>
                    </svg>
                  ) : (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-8 md:w-8">
                      <circle cx="24" cy="24" r="22" fill="url(#grad)" stroke="url(#grad)" strokeWidth="2" />
                      <path d="M20 16L32 24L20 32V16Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <defs>
                        <linearGradient id="grad" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#BF6AFF" />
                          <stop offset="1" stopColor="#7258F5" />
                        </linearGradient>
                      </defs>
                    </svg>
                  )}
                </button>
                <button
                  className="text-[#A0A0A0] hover:bg-gradient-to-r from-purple-500 to-pink-500 hover:text-white transition-colors p-2 rounded-full block w-10 h-10 md:w-12 md:h-12 flex items-center justify-center"
                  onClick={playNext}
                  aria-label="Next track"
                  disabled={state.loading}
                  title="下一首"
                >
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6">
                    <path d="M18 12L30 24L18 36V12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="32" y1="12" x2="32" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  className="text-[#A0A0A0] hover:bg-gradient-to-r from-purple-500 to-pink-500 hover:text-white transition-colors p-2 rounded-full block w-10 h-10 md:w-12 md:h-12 flex items-center justify-center"
                  onClick={togglePlaylist}
                  aria-label="Toggle playlist"
                  disabled={state.loading}
                  title="播放列表"
                >
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6">
                    <line x1="16" y1="18" x2="32" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="16" y1="24" x2="32" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="16" y1="30" x2="32" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  onClick={toggleControlLayout}
                  className="text-[#8A8A9A] hover:bg-gradient-to-r from-purple-500 to-pink-500 hover:text-white transition-colors p-2 rounded-full"
                  title={controlLayout === 'normal' ? '切换到悬浮球模式' : '切换到普通模式'}
                >
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="5" fill="currentColor" />
                  </svg>
                </button>
              </div>
              <VolumeControl volume={volume} onVolumeChange={handleVolumeChangeWithCallback} />
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <div
            className={`transition-all duration-300 overflow-hidden ${showPlaylist ? 'h-auto' : 'h-0'}`}
            style={{ maxHeight: showPlaylist ? listMaxHeight : '0' }}
          >
            <div className="bg-[#1E1E2F] p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">播放列表</h3>
                <button
                  onClick={togglePlaylist}
                  className="text-[#8A8A9A] hover:text-white transition-colors"
                  aria-label="Close playlist"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: `calc(${typeof listMaxHeight === 'number' ? `${listMaxHeight}px` : listMaxHeight} - 4rem)` }}>
                {audio.map((song, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-4 p-2 hover:bg-gray-700 cursor-pointer ${index === currentIndex ? 'bg-gray-700' : ''}`}
                    onClick={() => handleSongSelect(index)}
                  >
                    <img
                      src={getImageSrc(song.cover)}
                      alt={song.name}
                      className="w-12 h-12 rounded-md object-cover img-2"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = defaultCoverUrl;
                        handleImageError(song.cover);
                      }}
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">{song.name}</h3>
                      <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatTime(index === currentIndex ? currentTime : state.songDurations[song?.url] || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className={`md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300 ${showPlaylist ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={handleOutsideClick}
        >
          <div
            className={`fixed inset-y-0 right-0 w-4/5 bg-[#1E1E2F] transform transition-transform duration-300 ${showPlaylist ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">播放列表</h3>
                <button
                  onClick={togglePlaylist}
                  className="text-[#8A8A9A] hover:text-white transition-colors"
                  aria-label="Close playlist"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-6rem)]">
                <div className="flex flex-col space-y-2 p-4">
                  {audio.map((song, index) => (
                    <div
                      key={song.url}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-[#2A2A3F] transition-colors ${currentIndex === index ? 'bg-[#2A2A3F]' : ''}`}
                      onClick={() => handleSongSelect(index)}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-400">{index + 1}</span>
                        <div>
                          <h3 className="text-sm font-medium">{song.name}</h3>
                          <p className="text-xs text-gray-400">{song.artist}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatTime(index === currentIndex ? currentTime : state.songDurations[song?.url] || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isFloatingLayout && (
        <div
          className="fixed z-50"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            touchAction: 'none'
          }}
        >
          <div className="flex items-center space-x-2">
            {/* 悬浮球主体 */}
            <div
              className={`
                relative rounded-full shadow-lg overflow-hidden
                ${isDragging ? 'scale-95' : 'hover:scale-105'}
                transition-transform duration-200
              `}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              style={{ width: '64px', height: '64px' }}
            >
              {/* 背景封面 */}
              <div
                className="absolute inset-0 cursor-move"
                style={{
                  backgroundImage: `url(${getImageSrc(audio[currentIndex]?.cover)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {/* 添加一个默认背景，当图片加载失败时显示 */}
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${defaultCoverUrl})`,
                    opacity: imageLoadError[audio[currentIndex]?.cover] ? 1 : 0
                  }}
                />
              </div>

              {/* 播放按钮 */}
              <button
                className={`
                  absolute inset-0 w-full h-full flex items-center justify-center
                  ${state.loading || (isDragging && dragRef.current.dragged) ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}
                  group bg-transparent
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  if ((isDragging && dragRef.current.dragged) || state.loading) return;
                  handlePlayClick();
                }}
                disabled={state.loading || (isDragging && dragRef.current.dragged)}
              >
                {playing ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7 opacity-40 group-hover:opacity-90 transition-opacity duration-200"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="white"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7 opacity-40 group-hover:opacity-90 transition-opacity duration-200"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="white"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                )}
              </button>
            </div>

            {/* 展开/收起按钮 - 调整大小以匹配新的悬浮球尺寸 */}
            <button
              onClick={toggleFloatingControl}
              className={`
                bg-[#1E1E2F] rounded-full p-3 text-[#8A8A9A] hover:text-white 
                transition-all duration-300
                transform ${isFloatingControlExpanded ? 'rotate-180' : ''}
              `}
              title={isFloatingControlExpanded ? '收起控制面板' : '展开控制面板'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* 展开的控制面板 */}
            <div
              className={`
                absolute left-0 bottom-full mb-4 
                transition-all duration-300 ease-in-out origin-bottom-left
                ${isFloatingControlExpanded ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}
              `}
            >
              <div className="bg-[#1E1E2F] rounded-2xl shadow-lg overflow-hidden min-w-[320px] backdrop-blur-lg bg-opacity-95">
                {/* 错误提示（悬浮展开面板专用） */}
                {state.error && (
                  <div className="bg-red-500/90 text-white text-center p-2 rounded-t-2xl flex flex-col items-center">
                    <span>音频加载失败，可能是格式不支持或网络问题</span>
                    <button
                      onClick={retryPlay}
                      className="mt-1 px-3 py-1 bg-white/20 rounded-full hover:bg-white/40 transition-colors text-sm"
                    >重试</button>
                  </div>
                )}
                {/* 歌曲列表（放在操作栏上方） */}
                {showPlaylist && (
                  <div className="border-b border-gray-700/50">
                    <div className="max-h-[300px] overflow-y-auto">
                      {audio.map((song, index) => (
                        <div
                          key={index}
                          className={`
                            flex items-center space-x-3 p-3 hover:bg-white/5
                            ${currentIndex === index ? 'bg-white/10' : ''}
                            cursor-pointer transition-colors
                          `}
                          onClick={() => handleSongSelect(index)}
                        >
                          <div className="w-10 h-10 relative rounded-xl overflow-hidden flex-shrink-0">
                            <img
                              src={getImageSrc(song.cover)}
                              alt={song.name}
                              className="w-full h-full object-cover img-3"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = defaultCoverUrl;
                                handleImageError(song.cover);
                              }}
                              loading="lazy"
                            />
                            {currentIndex === index && playing && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <div className="w-4 h-4">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white truncate">{song.name}</div>
                            <div className="text-xs text-gray-400 truncate">{song.artist}</div>
                          </div>
                          <div className="text-xs text-gray-400 flex-shrink-0">
                            {formatTime(index === currentIndex ? currentTime : state.songDurations[song.url] || 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* 当前播放信息和控制按钮 */}
                <div className="p-4 space-y-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={getImageSrc(audio[currentIndex]?.cover)}
                      alt="Album Cover"
                      className="w-14 h-14 rounded-xl object-cover img-4"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = defaultCoverUrl;
                        handleImageError(audio[currentIndex]?.cover);
                      }}
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-white truncate">{audio[currentIndex]?.name}</h3>
                      <p className="text-sm text-[#8A8A9A] truncate">{audio[currentIndex]?.artist}</p>
                    </div>
                  </div>
                  <ProgressBar
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={handleSeek}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        className="text-[#8A8A9A] hover:bg-gradient-to-r from-purple-500 to-pink-500 hover:text-white transition-colors p-2 rounded-full"
                        onClick={togglePlayMode}
                        title={playMode === 'list' ? '列表循环' : playMode === 'random' ? '随机播放' : '单曲循环'}
                      >
                        {playMode === 'list' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : playMode === 'random' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            <circle cx="12" cy="12" r="3" fill="currentColor" />
                          </svg>
                        )}
                      </button>
                      <button
                        className="text-[#8A8A9A] hover:bg-gradient-to-r from-purple-500 to-pink-500 hover:text-white transition-colors p-2 rounded-full"
                        onClick={playPrev}
                        title="上一首"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      {/* 播放/暂停按钮 */}
                      <button
                        className={`p-3 rounded-full relative ${state.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={handlePlayClick}
                        aria-label={playing ? 'Pause' : 'Play'}
                        disabled={state.loading}
                        style={{
                          background: 'linear-gradient(135deg, #BF6AFF 0%, #7258F5 100%)'
                        }}
                      >
                        {state.loading ? (
                          <div className="animate-spin h-6 w-6">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        ) : playing ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="white">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="white">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                        )}
                      </button>
                      <button
                        className="text-[#8A8A9A] hover:bg-gradient-to-r from-purple-500 to-pink-500 hover:text-white transition-colors p-2 rounded-full"
                        onClick={playNext}
                        title="下一首"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {/* 播放列表切换按钮 */}
                      <button
                        className="text-[#8A8A9A] hover:bg-gradient-to-r from-purple-500 to-pink-500 hover:text-white transition-colors p-2 rounded-full"
                        onClick={togglePlaylist}
                        title="播放列表"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                      {/* 悬浮/普通模式切换按钮 */}
                      <button
                        onClick={toggleControlLayout}
                        className="text-[#8A8A9A] hover:bg-gradient-to-r from-purple-500 to-pink-500 hover:text-white transition-colors p-2 rounded-full"
                        title={controlLayout as ControlLayout === 'normal' ? '切换到悬浮球模式' : '切换到普通模式'}
                      >
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="5" fill="currentColor" />
                        </svg>
                      </button>
                    </div>
                    <VolumeControl volume={volume} onVolumeChange={handleVolumeChangeWithCallback} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}