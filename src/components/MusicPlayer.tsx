import React, { useEffect, useRef } from 'react';
import { useCallback } from 'react';
import ProgressBar from './ProgressBar';
import VolumeControl from './VolumeControl';
import Lyrics from './Lyrics';
import { useMusicContext } from '../contexts/MusicContext';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

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
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  preload = 'auto',
  autoplay = false,
  listMaxHeight = '24rem'
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
    currentView
  } = state;

  const {
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
    retryPlay
  } = useAudioPlayer();

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
      const direction = diff > 0 ? 'right' : 'left';
      dispatch({
        type: 'SET_CURRENT_VIEW',
        payload: direction === 'left' ? 'lyrics' : 'cover'
      });
    }
  };

  const togglePlayMode = useCallback(() => {
    dispatch({
      type: 'SET_PLAY_MODE',
      payload: playMode === 'list' ? 'random' : playMode === 'random' ? 'single' : 'list'
    });
  }, [playMode, dispatch]);

  const togglePlaylist = useCallback(() => {
    dispatch({ type: 'TOGGLE_PLAYLIST' });
  }, [dispatch]);

  const toggleView = useCallback(() => {
    dispatch({
      type: 'SET_CURRENT_VIEW',
      payload: currentView === 'cover' ? 'lyrics' : 'cover'
    });
  }, [currentView, dispatch]);

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
      switchToSong(index);
    }
  }, [switchToSong, state.loading]);

  return (
    <div className="player-container bg-[#1E1E2F] text-white relative">
      <audio
        ref={audioRef}
        src={audio[currentIndex].url}
        preload={preload}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        autoPlay={autoplay}
      />
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
                  target.src = 'https://via.placeholder.com/400x400?text=No+Image';
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
            <div className="flex items-center justify-center space-x-6">
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
                onClick={togglePlay}
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
            </div>
            <VolumeControl volume={volume} onVolumeChange={handleVolumeChange} />
          </div>
        </div>
      </div>

      {/* PC端播放列表 - 折叠面板 */}
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

      {/* 移动端播放列表 - 抽屉 */}
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
  )
}