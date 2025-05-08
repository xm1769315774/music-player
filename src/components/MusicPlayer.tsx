import React, { useEffect, useRef, useState, useCallback } from 'react';
import ProgressBar from './ProgressBar';
import VolumeControl from './VolumeControl';
import Lyrics from './Lyrics';
import { useMusicContext } from '../contexts/MusicContext';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { PlayMode, ControlLayout } from '../contexts/MusicContext';

interface MusicPlayerProps {
  audio: {
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
  preload = 'auto',
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
  const { state, dispatch } = useMusicContext();
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

  const {
    audioRef,
    togglePlay,
    playNext,
    playPrev,
    handleSeek,
    handleVolumeChange: handleVolumeChangeFromHook,
    handleTimeUpdate: handleTimeUpdateFromHook,
    handleLoadedMetadata,
    handleEnded: handleEndedFromHook,
    switchToSong,
    retryPlay
  } = useAudioPlayer(autoplay);

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
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
  }, [playMode, dispatch]);

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

  const toggleControlLayout = useCallback(() => {
    const newLayout: ControlLayout = controlLayout === 'normal' ? 'floating' : 'normal';
    dispatch({ type: 'SET_CONTROL_LAYOUT', payload: newLayout });
    if (onLayoutChange) {
      onLayoutChange(newLayout);
    }
  }, [controlLayout, dispatch, onLayoutChange]);

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

  const handleOutsideClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
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
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; dragged: boolean }>(
    {
      startX: 0,
      startY: 0,
      initialX: 0,
      initialY: 0,
      dragged: false
    }
  );

  // 保存位置到 localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('floatingBallPosition');
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('floatingBallPosition', JSON.stringify(position));
  }, [position]);

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
  const handleDrag = useCallback((e: MouseEvent | TouchEvent) => {
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
    console.log('drag end');
  }, []);

  // 添加和移除事件监听
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag, false);
      window.addEventListener('touchmove', handleDrag, { passive: false });
      window.addEventListener('mouseup', handleDragEnd, false);
      window.addEventListener('touchend', handleDragEnd, false);
    }

    return () => {
      window.removeEventListener('mousemove', handleDrag, false);
      window.removeEventListener('touchmove', handleDrag, false);
      window.removeEventListener('mouseup', handleDragEnd, false);
      window.removeEventListener('touchend', handleDragEnd, false);
    };
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
    handleEndedFromHook();
    if (onEnded) {
      onEnded();
    }
  }, [handleEndedFromHook, onEnded]);

  const handleTimeUpdateWithCallback = useCallback(() => {
    handleTimeUpdateFromHook();
    if (onTimeUpdate && audioRef.current) {
      onTimeUpdate(audioRef.current.currentTime, audioRef.current.duration);
    }
  }, [handleTimeUpdateFromHook, onTimeUpdate, audioRef]);

  const handleVolumeChangeWithCallback = useCallback((volumeOrEvent: number | React.ChangeEvent<HTMLInputElement>) => {
    handleVolumeChangeFromHook(volumeOrEvent);
    if (onVolumeChange) {
      const volume = typeof volumeOrEvent === 'number' ? volumeOrEvent : parseFloat(volumeOrEvent.target.value);
      onVolumeChange(volume);
    }
  }, [handleVolumeChangeFromHook, onVolumeChange]);

  const handlePlayModeChangeWithCallback = useCallback((mode: PlayMode) => {
    dispatch({ type: 'SET_PLAY_MODE', payload: mode });
    if (onPlayModeChange) {
      onPlayModeChange(mode);
    }
  }, [dispatch, onPlayModeChange]);

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
      if (savedProgress && audioRef.current) {
        const { currentTime, currentIndex: savedIndex, volume: savedVolume } = JSON.parse(savedProgress);
        if (savedIndex === currentIndex) {
          audioRef.current.currentTime = currentTime;
          handleVolumeChangeWithCallback(savedVolume);
        }
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

  return (
    <div className="player-container bg-[#1E1E2F] text-white relative">

      <audio
        ref={audioRef}
        src={audio[currentIndex].url}
        preload={preload}
        onTimeUpdate={handleTimeUpdateWithCallback}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEndedWithCallback}
      />

      <div className={`${controlLayout === 'floating' ? 'hidden' : 'block'}`}>
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
                <img
                  src={audio[currentIndex].cover}
                  alt={audio[currentIndex].name}
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/src/assets/default-cover.jpg';
                  }}
                />
              </div>
            </div>
            <div className={`h-full w-full ${currentView === 'lyrics' ? 'block' : 'hidden md:block'}`}>
              <Lyrics
                lrc={audio[currentIndex].lrc || ''}
                currentTime={currentTime}
                onSeek={handleSeek}
                className="h-full"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">{audio[currentIndex].name}</h2>
                <p className="text-sm text-[#8A8A9A]">{audio[currentIndex].artist}</p>
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
                  className={`text-[#8A8A9A] hover:bg-gradient-to-r from-purple-500 to-pink-500 hover:text-white transition-colors p-2 rounded-full block focus:outline-none focus:ring-2 focus:ring-purple-500 active:scale-95 transform ${state.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={togglePlayMode}
                  aria-label="Toggle play mode"
                  disabled={state.loading}
                  title={playMode === 'list' ? '列表循环' : playMode === 'random' ? '随机播放' : '单曲循环'}
                >
                  {playMode === 'list' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : playMode === 'random' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      <circle cx="12" cy="12" r="3" fill="currentColor" />
                    </svg>
                  )}
                </button>
                <button
                  className="text-[#A0A0A0] hover:bg-gradient-to-r from-purple-500 to-pink-500 hover:text-white transition-colors p-2 rounded-full block"
                  onClick={playPrev}
                  aria-label="Previous track"
                  disabled={state.loading}
                  title="上一首"
                >
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                    <path d="M30 36L18 24L30 12V36Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="16" y1="12" x2="16" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
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
                    <div className="animate-spin h-7 w-7">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : playing ? (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
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
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
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
                  className="text-[#A0A0A0] hover:bg-gradient-to-r from-purple-500 to-pink-500 hover:text-white transition-colors p-2 rounded-full block"
                  onClick={playNext}
                  aria-label="Next track"
                  disabled={state.loading}
                  title="下一首"
                >
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                    <path d="M18 12L30 24L18 36V12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="32" y1="12" x2="32" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  className="text-[#A0A0A0] hover:bg-gradient-to-r from-purple-500 to-pink-500 hover:text-white transition-colors p-2 rounded-full block"
                  onClick={togglePlaylist}
                  aria-label="Toggle playlist"
                  disabled={state.loading}
                  title="播放列表"
                >
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                    <line x1="16" y1="18" x2="32" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="16" y1="24" x2="32" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="16" y1="30" x2="32" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  onClick={toggleControlLayout}
                  className="text-[#8A8A9A] hover:bg-gradient-to-r from-purple-500 to-pink-500 hover:text-white transition-colors p-2 rounded-full block"
                  title={controlLayout === 'normal' ? '切换到悬浮球模式' : '切换到普通模式'}
                >
                  {controlLayout === 'normal' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
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
                      src={song.cover}
                      alt={song.name}
                      className="w-12 h-12 rounded object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/48x48?text=No+Image';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">{song.name}</h3>
                      <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatTime(index === currentIndex ? currentTime : state.songDurations[song.url] || 0)}
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
                        {formatTime(index === currentIndex ? currentTime : state.songDurations[song.url] || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {controlLayout === 'floating' && (
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
                  backgroundImage: `url(${audio[currentIndex].cover})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
                onError={(e) => {
                  const target = e.target as HTMLDivElement;
                  target.style.backgroundImage = 'url(/src/assets/default-cover.jpg)';
                }}
              />

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
                              src={song.cover}
                              alt={song.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/src/assets/default-cover.jpg';
                              }}
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
                      src={audio[currentIndex].cover}
                      alt={audio[currentIndex].name}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-white truncate">{audio[currentIndex].name}</h3>
                      <p className="text-sm text-[#8A8A9A] truncate">{audio[currentIndex].artist}</p>
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
                        title={controlLayout === 'normal' ? '切换到悬浮球模式' : '切换到普通模式'}
                      >
                        {controlLayout === 'normal' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
                          </svg>
                        )}
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