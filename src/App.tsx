import { useState } from 'react';
import { MusicPlayer } from '@/components/MusicPlayer';
import { MusicProvider } from '@/contexts/MusicContext';
import { songs } from '@/data/songs';
import './App.css';

function App() {
  const [currentSongs, setCurrentSongs] = useState(songs);
  const [currentPage, setCurrentPage] = useState<'main' | 'normal' | 'floating'>('main');

  const handleUpdatePlaylist = () => {
    const testSongs = [
      {
        title: '测试歌曲1',
        author: '测试歌手1',
        url: 'https://api.i-meto.com/meting/api?server=netease&type=url&id=2013978728&auth=39a93be20c13c1ae4e8b9fbd2df021435556106a',
        pic: 'https://api.i-meto.com/meting/api?server=netease&type=pic&id=109951168229237090&auth=a57ed0df2f60e735cc8345f41e18475988599949',
        lrc: '[00:00.00]测试歌词 1'
      },
      {
        title: '测试歌曲2',
        author: '测试歌手2',
        url: 'https://api.i-meto.com/meting/api?server=netease&type=url&id=563586077&auth=29a46a9f6af178a770b5865bf2b9a5b684431c1a',
        pic: 'https://api.i-meto.com/meting/api?server=netease&type=pic&id=109951165994333268&auth=4d8ae05005213e4fa039c92082e6d39db45b794a',
        lrc: '[00:00.00]测试歌词 2'
      }
    ];
    setCurrentSongs(testSongs);
  };

  const handleResetPlaylist = () => {
    setCurrentSongs(songs);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'normal':
        return (
          <div className="min-h-screen bg-gray-900 text-white">
            <div className="container mx-auto px-4 py-8">
              <button
                onClick={() => setCurrentPage('main')}
                className="mb-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                返回主页
              </button>
              <MusicPlayer initialLayout="normal" />
            </div>
          </div>
        );
      case 'floating':
        return (
          <div className="min-h-screen bg-gray-900 text-white">
            <div className="container mx-auto px-4 py-8">
              <button
                onClick={() => setCurrentPage('main')}
                className="mb-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                返回主页
              </button>
              <MusicPlayer initialLayout="floating" />
            </div>
          </div>
        );
      default:
        return (
          <div className="min-h-screen bg-gray-900 text-white">
            <div className="container mx-auto px-4 py-8">
              <div className="flex justify-center space-x-4 mb-8">
                <button
                  onClick={handleUpdatePlaylist}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  切换到测试歌曲
                </button>
                <button
                  onClick={handleResetPlaylist}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  恢复原始列表
                </button>
                <button
                  onClick={() => setCurrentPage('normal')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  打开常规播放器
                </button>
                <button
                  onClick={() => setCurrentPage('floating')}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  打开悬浮球播放器
                </button>
              </div>
              <MusicPlayer initialLayout="normal" />
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <MusicProvider
        songs={currentSongs}
        autoplay={true}
      >
        {renderContent()}
      </MusicProvider>
    </>
  );
}

export default App;