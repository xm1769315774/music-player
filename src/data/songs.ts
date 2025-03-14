interface Song {
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

export type { Song };

export const songs: Song[] = [
  {
    title: "蝉（2022年CCTV3星光大道）（Live）",
    author: "戴林港",
    url: "https://api.i-meto.com/meting/api?server=netease&type=url&id=2013978728&auth=39a93be20c13c1ae4e8b9fbd2df021435556106a",
    pic: "https://api.i-meto.com/meting/api?server=netease&type=pic&id=109951168229237090&auth=a57ed0df2f60e735cc8345f41e18475988599949",
    lrc: "https://api.i-meto.com/meting/api?server=netease&type=lrc&id=2013978728&auth=96a8b036d3476be1c7b37dbf37174308b9fcecc1"
  },
  {
    title: "手扶拖拉机斯基",
    author: "张蔷",
    url: "https://api.i-meto.com/meting/api?server=tencent&type=url&id=001z9lAz1dL98r&auth=7632a6f5a3d332677de060c14b4ab651db13eec1",
    pic: "https://api.i-meto.com/meting/api?server=tencent&type=pic&id=002TpJp33YuXFn&auth=c93a4fb35c9c7fe3b3989f860d149444f53d7fd3",
    lrc: "https://api.i-meto.com/meting/api?server=tencent&type=lrc&id=001z9lAz1dL98r&auth=9fb3b0efd7429e4f693685dce107bea39a121d16"
  },
  {
    title: "西海情歌",
    author: "降央卓玛",
    url: "https://api.i-meto.com/meting/api?server=tencent&type=url&id=003U75JX3PXZ3P&auth=762276693bc68d331632059f48d3b8c314effb72",
    pic: "https://api.i-meto.com/meting/api?server=tencent&type=pic&id=001YIOBO3rTxho&auth=0b1f5c32b1816c45777fd97ed6a021713313d9d7",
    lrc: "https://api.i-meto.com/meting/api?server=tencent&type=lrc&id=003U75JX3PXZ3P&auth=7f6aaf4dca0b8b7f537dba6d028d59f1322c5068"
  },
  {
    title: "把回忆拼好给你",
    author: "REBORN",
    url: "https://api.i-meto.com/meting/api?server=tencent&type=url&id=0031P6B31wRc72&auth=9fe7118729e895f69258e0b6622e2ef3b9246511",
    pic: "https://api.i-meto.com/meting/api?server=tencent&type=pic&id=003LyJG13W2Zv4&auth=b2727fabc737e7241131caf264acb7b2e81233c2",
    lrc: "https://api.i-meto.com/meting/api?server=tencent&type=lrc&id=0031P6B31wRc72&auth=03dcb9bd10c6da7f045da59330cb9fd76a285176"
  },
  {
    title: "芦苇飞",
    author: "汽水波波子",
    url: "https://api.i-meto.com/meting/api?server=netease&type=url&id=2642500476&auth=cc23d357b7b9ad54951ba484cd8db3af0eb81385",
    pic: "https://api.i-meto.com/meting/api?server=netease&type=pic&id=109951170107875194&auth=90b764da8c924427472eba4b6e95e2353cab1cd8",
    lrc: "https://api.i-meto.com/meting/api?server=netease&type=lrc&id=2642500476&auth=cbf360b5c29582f69ecd9df7bc047e2c5e9e902d"
  }
];
