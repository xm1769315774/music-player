import { useRef, useCallback, useEffect } from 'react';
import { useMusicContext } from '../contexts/MusicContext';

export const useAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { state, dispatch } = useMusicContext();
  const { playlist, currentIndex, playing, playMode, randomOrder } = state;

  const handlePlayError = useCallback((error: Error) => {
    console.error('播放失败:', error);
    dispatch({ type: 'SET_PLAYING', payload: false });
    dispatch({ type: 'SET_ERROR', payload: '音频加载失败，点击重试' });
    dispatch({ type: 'SET_LOADING', payload: false });
  }, [dispatch]);

  const playAudio = useCallback(async () => {
    if (audioRef.current) {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      try {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          dispatch({ type: 'SET_PLAYING', payload: true });
          dispatch({ type: 'SET_ERROR', payload: null }); // 确保成功播放后清除错误信息
        }
      } catch (error) {
        if ((error as Error).name === 'NotAllowedError') {
          dispatch({ type: 'SET_ERROR', payload: '需要点击页面任意位置来开始播放' });
          const handleFirstInteraction = () => {
            playAudio();
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('touchstart', handleFirstInteraction);
            dispatch({ type: 'SET_ERROR', payload: null }); // 清除错误信息
          };
          document.addEventListener('click', handleFirstInteraction);
          document.addEventListener('touchstart', handleFirstInteraction);
        } else {
          handlePlayError(error as Error);
        }
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  }, [dispatch, handlePlayError]);

  const retryPlay = useCallback(async () => {
    if (audioRef.current) {
      dispatch({ type: 'SET_ERROR', payload: null });
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        await audioRef.current.load();
        await playAudio();
      } catch (error) {
        handlePlayError(error as Error);
      }
    }
  }, [dispatch, playAudio, handlePlayError]);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause();
        dispatch({ type: 'SET_PLAYING', payload: false });
      } else {
        playAudio();
      }
    }
  }, [playing, dispatch, playAudio]);

  const generateRandomOrder = useCallback((length: number): number[] => {
    const array = Array.from({ length }, (_, i) => i);
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }, []);

  useEffect(() => {
    if (playMode === 'random' && randomOrder.length === 0) {
      dispatch({ type: 'SET_RANDOM_ORDER', payload: generateRandomOrder(playlist.length) });
    }
  }, [playMode, playlist.length, randomOrder.length, dispatch, generateRandomOrder]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
    }
  }, [state.volume]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      dispatch({ type: 'SET_CURRENT_TIME', payload: audioRef.current.currentTime });
    }
  }, [dispatch]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      const duration = audioRef.current.duration;
      if (!isNaN(duration) && isFinite(duration) && duration > 0) {
        dispatch({ type: 'SET_DURATION', payload: duration });
        dispatch({ type: 'SET_SONG_DURATION', payload: { url: audioRef.current.src, duration } });
      } else {
        // 如果获取不到有效时长，设置加载状态
        dispatch({ type: 'SET_LOADING', payload: true });
        // 尝试重新获取时长
        const checkDuration = () => {
          if (audioRef.current) {
            const newDuration = audioRef.current.duration;
            if (!isNaN(newDuration) && isFinite(newDuration) && newDuration > 0) {
              dispatch({ type: 'SET_DURATION', payload: newDuration });
              dispatch({ type: 'SET_SONG_DURATION', payload: { url: audioRef.current.src, duration: newDuration } });
              dispatch({ type: 'SET_LOADING', payload: false });
            } else if (audioRef.current.readyState < 4) {
              // 如果音频还未完全加载，继续等待
              setTimeout(checkDuration, 100);
            } else {
              // 如果加载完成仍仍无法获取时长，设置默认值
              dispatch({ type: 'SET_DURATION', payload: 0 });
              dispatch({ type: 'SET_LOADING', payload: false });
            }
          }
        };
        checkDuration();
      }
      if (!playing && audioRef.current.autoplay) {
        playAudio();
      }
    }
  }, [dispatch, playing, playAudio]);

  const handleEnded = useCallback(() => {
    if (playMode === 'single') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(handlePlayError);
      }
    } else {
      playNext();
    }
  }, [playMode, handlePlayError]);

  const preloadAudio = useCallback((url: string) => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
    return new Promise((resolve, reject) => {
      const handleLoadedMetadata = () => {
        const duration = audio.duration;
        if (!isNaN(duration) && isFinite(duration)) {
          dispatch({ type: 'SET_SONG_DURATION', payload: { url, duration } });
        }
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
      const handleCanPlayThrough = () => {
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        audio.removeEventListener('error', handleError);
        resolve(audio);
      };
      const handleError = (e: ErrorEvent) => {
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        reject(new Error(e.error ? `预加载失败: ${e.error}` : '预加载失败，请检查网络连接'));
      };
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
      audio.addEventListener('error', handleError, { once: true });
    });
  }, [dispatch]);

  const switchToSong = useCallback((targetIndex: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
      dispatch({ type: 'SET_PLAYING', payload: false });
      dispatch({ type: 'SET_CURRENT_INDEX', payload: targetIndex });
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // 移除之前的事件监听器
      const oldAudio = audioRef.current;

      // 预加载当前歌曲
      preloadAudio(playlist[targetIndex].url)
        .then((newAudio) => {
          // 设置音频属性
          newAudio.volume = state.volume;
          audioRef.current = newAudio;

          // 添加事件监听
          newAudio.addEventListener('timeupdate', handleTimeUpdate);
          newAudio.addEventListener('ended', handleEnded);

          let retryCount = 0;
          const maxRetries = 3;

          const tryPlay = () => {
            if (audioRef.current) {
              audioRef.current.play().then(() => {
                dispatch({ type: 'SET_PLAYING', payload: true });
                dispatch({ type: 'SET_LOADING', payload: false });
                dispatch({ type: 'SET_ERROR', payload: null });

                // 预加载下一首歌曲
                const nextIndex = (targetIndex + 1) % playlist.length;
                preloadAudio(playlist[nextIndex].url).catch(() => { });
              }).catch((error) => {
                if (error.name === 'NotAllowedError') {
                  dispatch({ type: 'SET_ERROR', payload: '需要点击页面任意位置来开始播放' });
                  const handleFirstInteraction = () => {
                    tryPlay();
                    document.removeEventListener('click', handleFirstInteraction);
                    document.removeEventListener('touchstart', handleFirstInteraction);
                  };
                  document.addEventListener('click', handleFirstInteraction);
                  document.addEventListener('touchstart', handleFirstInteraction);
                } else if (retryCount < maxRetries) {
                  retryCount++;
                  dispatch({ type: 'SET_ERROR', payload: `加载失败，正在重试 (${retryCount}/${maxRetries})` });
                  setTimeout(tryPlay, 1000);
                } else {
                  handlePlayError(error);
                }
              });
            }
          };

          tryPlay();
        })
        .catch((error) => {
          handlePlayError(error);
          dispatch({ type: 'SET_LOADING', payload: false });
        });

      // 清理旧的音频元素
      oldAudio.pause();
      oldAudio.src = '';
      oldAudio.removeEventListener('timeupdate', handleTimeUpdate);
      oldAudio.removeEventListener('ended', handleEnded);
      oldAudio.load();
    }
  }, [playlist, dispatch, handlePlayError, state.volume, preloadAudio, handleTimeUpdate, handleEnded]);

  const playNext = useCallback(() => {
    let nextIndex;
    if (playMode === 'random') {
      const currentRandomIndex = randomOrder.indexOf(currentIndex);
      nextIndex = randomOrder[(currentRandomIndex + 1) % playlist.length];
    } else {
      nextIndex = (currentIndex + 1) % playlist.length;
    }
    switchToSong(nextIndex);
  }, [currentIndex, playMode, randomOrder, playlist.length, switchToSong]);

  const playPrev = useCallback(() => {
    let prevIndex;
    if (playMode === 'random') {
      const currentRandomIndex = randomOrder.indexOf(currentIndex);
      prevIndex = randomOrder[(currentRandomIndex - 1 + playlist.length) % playlist.length];
    } else {
      prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    }
    switchToSong(prevIndex);
  }, [currentIndex, playMode, randomOrder, playlist.length, switchToSong]);

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      dispatch({ type: 'SET_CURRENT_TIME', payload: time });
    }
  }, [dispatch]);

  const handleVolumeChange = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      dispatch({ type: 'SET_VOLUME', payload: volume });
    }
  }, [dispatch]);

  return {
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
  };
};