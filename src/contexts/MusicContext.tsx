import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';

export interface Song {
  name?: string;
  title?: string;
  artist?: string;
  author?: string;
  url: string;
  cover?: string;
  pic?: string;
  lrc?: string;
  theme?: string;
}

type NormalizedSong = {
  name: string;
  artist: string;
  url: string;
  cover: string;
  lrc?: string;
  theme?: string;
}

const normalizeSong = (song: Song): NormalizedSong => ({
  name: song?.name || song?.title || 'Unknown',
  artist: song?.artist || song?.author || 'Unknown',
  url: song?.url,
  cover: song?.cover || song?.pic || '',
  lrc: song?.lrc,
  theme: song?.theme
});

export type PlayMode = 'list' | 'random' | 'single';

export type ControlLayout = 'normal' | 'floating';
interface MusicState {
  playlist: NormalizedSong[];
  currentIndex: number;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playMode: PlayMode;
  showPlaylist: boolean;
  currentView: 'cover' | 'lyrics';
  controlLayout: ControlLayout;
  loading: boolean;
  error: string | null;
  songDurations: Record<string, number>;
  randomOrder: number[];
}

type MusicAction =
  | { type: 'SET_PLAYLIST'; payload: MusicState['playlist'] }
  | { type: 'SET_CURRENT_INDEX'; payload: number }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_PLAY_MODE'; payload: PlayMode }
  | { type: 'TOGGLE_PLAYLIST'; payload?: boolean }
  | { type: 'SET_CURRENT_VIEW'; payload: 'cover' | 'lyrics' }
  | { type: 'SET_CONTROL_LAYOUT'; payload: ControlLayout }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SONG_DURATION'; payload: { url: string; duration: number } }
  | { type: 'SET_RANDOM_ORDER'; payload: number[] };

const initialState: MusicState = {
  playlist: [],
  currentIndex: 0,
  playing: false,
  currentTime: 0,
  duration: 0,
  volume: 0.5,
  playMode: 'list',
  showPlaylist: false,
  currentView: 'cover',
  controlLayout: 'normal',
  loading: false,
  error: null,
  songDurations: {},
  randomOrder: []
};

const MusicContext = createContext<{
  state: MusicState;
  dispatch: React.Dispatch<MusicAction>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  togglePlay: () => void;
  playNext: () => void;
  playPrev: () => void;
  handleSeek: (time: number) => void;
  handleVolumeChange: (volumeOrEvent: number | React.ChangeEvent<HTMLInputElement>) => void;
  handleTimeUpdate: () => void;
  handleLoadedMetadata: () => void;
  handleEnded: () => void;
  switchToSong: (index: number) => void;
  retryPlay: () => void;
  togglePlayMode: () => void;
}>({
  state: initialState,
  dispatch: () => null,
  audioRef: { current: null },
  togglePlay: () => { },
  playNext: () => { },
  playPrev: () => { },
  handleSeek: () => { },
  handleVolumeChange: () => { },
  handleTimeUpdate: () => { },
  handleLoadedMetadata: () => { },
  handleEnded: () => { },
  switchToSong: () => { },
  retryPlay: () => { },
  togglePlayMode: () => { }
});

const musicReducer = (state: MusicState, action: MusicAction): MusicState => {
  switch (action.type) {
    case 'SET_PLAYLIST':
      return { ...state, playlist: action.payload };
    case 'SET_CURRENT_INDEX':
      return { ...state, currentIndex: action.payload };
    case 'SET_PLAYING':
      return { ...state, playing: action.payload };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'SET_PLAY_MODE':
      return { ...state, playMode: action.payload };
    case 'TOGGLE_PLAYLIST':
      return { ...state, showPlaylist: action.payload !== undefined ? action.payload : !state.showPlaylist };
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_CONTROL_LAYOUT':
      return { ...state, controlLayout: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SONG_DURATION':
      return {
        ...state,
        songDurations: {
          ...state.songDurations,
          [action.payload.url]: action.payload.duration
        }
      };
    case 'SET_RANDOM_ORDER':
      return { ...state, randomOrder: action.payload };
    default:
      return state;
  }
};

interface MusicProviderProps {
  children: React.ReactNode;
  songs?: Song[];
  autoplay?: boolean;
}

export const MusicProvider: React.FC<MusicProviderProps> = ({ children, songs = [], autoplay = false }) => {
  const [state, dispatch] = useReducer(musicReducer, {
    ...initialState,
    playlist: songs?.filter(song => song?.url)?.map(normalizeSong) || []
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRY_COUNT = 3;

  const generateRandomOrder = useCallback((length: number): number[] => {
    const array = Array.from({ length }, (_, i) => i);
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }, []);

  const playWithRetry = useCallback(async (audio: HTMLAudioElement) => {
    try {
      await audio.play();
      dispatch({ type: 'SET_PLAYING', payload: true });
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: null });
      retryCountRef.current = 0;
    } catch (error) {
      if (retryCountRef.current < MAX_RETRY_COUNT) {
        retryCountRef.current += 1;
        console.log(`播放失败，第 ${retryCountRef.current} 次重试...`);
        setTimeout(() => {
          audio.load();
          playWithRetry(audio);
        }, 1000);
      } else {
        dispatch({ type: 'SET_ERROR', payload: '播放失败，请检查音频文件' });
        dispatch({ type: 'SET_PLAYING', payload: false });
        dispatch({ type: 'SET_LOADING', payload: false });
        retryCountRef.current = 0;
      }
    }
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (state.playing) {
      audio.pause();
      dispatch({ type: 'SET_PLAYING', payload: false });
      dispatch({ type: 'SET_LOADING', payload: false });
    } else {
      dispatch({ type: 'SET_LOADING', payload: true });
      playWithRetry(audio);
    }
  }, [state.playing, playWithRetry]);

  const playNext = useCallback(() => {
    if (state.playlist.length === 0) return;

    let nextIndex: number;
    if (state.playMode === 'random') {
      const currentRandomIndex = state.randomOrder.indexOf(state.currentIndex);
      nextIndex = state.randomOrder[(currentRandomIndex + 1) % state.randomOrder.length];
    } else {
      nextIndex = (state.currentIndex + 1) % state.playlist.length;
    }

    const audio = audioRef.current;
    if (!audio) return;

    dispatch({ type: 'SET_CURRENT_INDEX', payload: nextIndex });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_PLAYING', payload: true });

    audio.src = state.playlist[nextIndex].url;
    audio.load();
    playWithRetry(audio);
  }, [state.currentIndex, state.playlist, state.playMode, state.randomOrder, playWithRetry]);

  const playPrev = useCallback(() => {
    if (state.playlist.length === 0) return;

    let prevIndex: number;
    if (state.playMode === 'random') {
      const currentRandomIndex = state.randomOrder.indexOf(state.currentIndex);
      prevIndex = state.randomOrder[(currentRandomIndex - 1 + state.randomOrder.length) % state.randomOrder.length];
    } else {
      prevIndex = (state.currentIndex - 1 + state.playlist.length) % state.playlist.length;
    }

    const audio = audioRef.current;
    if (!audio) return;

    dispatch({ type: 'SET_CURRENT_INDEX', payload: prevIndex });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_PLAYING', payload: true });

    audio.src = state.playlist[prevIndex].url;
    audio.load();
    playWithRetry(audio);
  }, [state.currentIndex, state.playlist, state.playMode, state.randomOrder, playWithRetry]);

  const handleSeek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    dispatch({ type: 'SET_CURRENT_TIME', payload: time });
  }, []);

  const handleVolumeChange = useCallback((volumeOrEvent: number | React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const volume = typeof volumeOrEvent === 'number' ? volumeOrEvent : parseFloat(volumeOrEvent.target.value);
    audio.volume = volume;
    dispatch({ type: 'SET_VOLUME', payload: volume });
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    dispatch({ type: 'SET_CURRENT_TIME', payload: audio.currentTime });
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    dispatch({ type: 'SET_DURATION', payload: audio.duration });
    dispatch({ type: 'SET_SONG_DURATION', payload: { url: state.playlist[state.currentIndex].url, duration: audio.duration } });
    dispatch({ type: 'SET_LOADING', payload: false });
  }, [state.currentIndex, state.playlist]);

  const handleEnded = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (state.playMode === 'single') {
      audio.currentTime = 0;
      audio.play()
        .then(() => {
          dispatch({ type: 'SET_PLAYING', payload: true });
        })
        .catch(error => {
          dispatch({ type: 'SET_ERROR', payload: error.message });
          dispatch({ type: 'SET_PLAYING', payload: false });
        });
    } else {
      playNext();
    }
  }, [state.playMode, playNext]);

  const switchToSong = useCallback((index: number) => {
    if (index >= 0 && index < state.playlist.length) {
      const audio = audioRef.current;
      if (!audio) return;

      dispatch({ type: 'SET_CURRENT_INDEX', payload: index });
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_PLAYING', payload: true });

      audio.src = state.playlist[index].url;
      audio.load();
      playWithRetry(audio);
    }
  }, [state.playlist, playWithRetry]);

  const retryPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_LOADING', payload: true });
    audio.load();
    playWithRetry(audio);
  }, [playWithRetry]);

  const togglePlayMode = useCallback(() => {
    const newMode = state.playMode === 'single' ? 'random' : state.playMode === 'random' ? 'list' : 'single';
    dispatch({ type: 'SET_PLAY_MODE', payload: newMode });

    if (newMode === 'random') {
      dispatch({
        type: 'SET_RANDOM_ORDER',
        payload: generateRandomOrder(state.playlist.length)
      });
    }
  }, [state.playMode, state.playlist.length, generateRandomOrder]);

  useEffect(() => {
    const validSongs = songs?.filter(song => song?.url)?.map(normalizeSong) || [];
    dispatch({ type: 'SET_PLAYLIST', payload: validSongs });
    dispatch({ type: 'SET_CURRENT_INDEX', payload: 0 });
    dispatch({ type: 'SET_PLAYING', payload: false });
    dispatch({ type: 'SET_CURRENT_TIME', payload: 0 });
    dispatch({ type: 'SET_DURATION', payload: 0 });
  }, [songs]);

  useEffect(() => {
    if (state.playMode === 'random') {
      dispatch({
        type: 'SET_RANDOM_ORDER',
        payload: generateRandomOrder(state.playlist.length)
      });
    }
  }, [state.playMode, state.playlist.length, generateRandomOrder]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || state.playlist.length === 0) return;

    // 当 currentIndex 变化时，更新音频源
    audio.src = state.playlist[state.currentIndex].url;
    audio.load();

    if (state.playing) {
      dispatch({ type: 'SET_LOADING', payload: true });
      playWithRetry(audio);
    }
  }, [state.currentIndex, state.playlist, state.playing, dispatch, playWithRetry]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleError = () => {
      dispatch({ type: 'SET_ERROR', payload: '音频加载失败' });
      dispatch({ type: 'SET_PLAYING', payload: false });
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    audio.addEventListener('error', handleError);
    return () => {
      audio.removeEventListener('error', handleError);
    };
  }, [dispatch]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (autoplay) {
      dispatch({ type: 'SET_LOADING', payload: true });
      audio.play()
        .then(() => {
          dispatch({ type: 'SET_PLAYING', payload: true });
          dispatch({ type: 'SET_LOADING', payload: false });
        })
        .catch((error: any) => {
          dispatch({ type: 'SET_PLAYING', payload: false });
          dispatch({ type: 'SET_LOADING', payload: false });
          console.error('Autoplay failed:', error);
        });
    }
  }, [autoplay, dispatch]);

  return (
    <MusicContext.Provider value={{
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
      togglePlayMode
    }}>
      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => dispatch({ type: 'SET_ERROR', payload: '音频加载失败' })}
        onVolumeChange={() => handleVolumeChange(state.volume)}
      />
      {children}
    </MusicContext.Provider>
  );
};

export const useMusicContext = () => useContext(MusicContext);

