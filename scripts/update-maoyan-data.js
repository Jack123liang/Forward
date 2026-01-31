import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置项
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_REQUEST_DELAY = 300; 
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'maoyan-data.json');

const PLATFORMS = [
  { title: "全网", value: "0" }, { title: "优酷", value: "1" },
  { title: "爱奇艺", value: "2" }, { title: "腾讯视频", value: "3" },
  { title: "芒果TV", value: "7" }
];

function cleanShowName(showName) {
  return showName.replace(/(第[\d一二三四五六七八九十]+季)/g, '').replace(/特别版|精华版/g, '').trim();
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function searchTMDB(showName) {
  if (!TMDB_API_KEY) return null;
  try {
    const cleanedName = cleanShowName(showName);
    const response = await axios.get(`${TMDB_BASE_URL}/search/multi`, {
      params: { query: cleanedName, language: 'zh-CN' },
      headers: { 'Authorization': `Bearer ${TMDB_API_KEY}` }
    });
    
    if (response.data.results?.length > 0) {
      const match = response.data.results[0];
      return {
        title: match.name || match.title,
        poster: match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : null,
        rating: match.vote_average,
        overview: match.overview
      };
    }
    return null;
  } catch (e) { return null; }
}

async function fetchPlatformData(platform, type) {
  try {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const url = `https://piaofang.maoyan.com/dashboard/webHeatData?showDate=${date}&seriesType=${type}&platformType=${platform.value}`;
    
    const res = await axios.get(url, { headers: { "User-Agent": USER_AGENT, "referer": "https://piaofang.maoyan.com/" } });
    const list = res.data?.dataList?.list || [];
    
    const results = [];
    for (const item of list.slice(0, 15)) { // 每个平台取前15名
      const name = item.seriesInfo.name;
      await delay(TMDB_REQUEST_DELAY);
      const tmdb = await searchTMDB(name);
      
      // 关键修复：即使 TMDB 没搜到，也保留猫眼的数据
      results.push({
        name: name,
        heat: item.heatScore,
        ...tmdb
      });
    }
    return results;
  } catch (e) {
    console.error(`抓取 ${platform.title} 失败: ${e.message}`);
    return [];
  }
}

async function main() {
  if (!TMDB_API_KEY) console.warn("⚠️ 未设置 TMDB_API_KEY，将只抓取原始名称");

  const result = {
    last_updated: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    tv: {},
    show: {}
  };

  for (const p of PLATFORMS) {
    result.tv[p.title] = await fetchPlatformData(p, ''); // 剧集
    result.show[p.title] = await fetchPlatformData(p, '2'); // 综艺
  }

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  // 修正：保存 result 变量
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log('✅ 数据已成功更新至 data/maoyan-data.json');
}

main().catch(e => { console.error(e); process.exit(1); });
