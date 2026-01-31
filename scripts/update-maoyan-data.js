import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 配置项 ---
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
const TMDB_API_KEY = process.env.TMDB_API_KEY; // 请确保在 GitHub Secrets 中配置
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_REQUEST_DELAY = 300; 
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'maoyan-data.json');

const PLATFORMS = [
  { title: "全网", value: "0" },
  { title: "优酷", value: "1" },
  { title: "爱奇艺", value: "2" },
  { title: "腾讯视频", value: "3" },
  { title: "芒果TV", value: "7" }
];

// --- 工具函数 ---
function cleanShowName(showName) {
  return showName.replace(/(第[\d一二三四五六七八九十]+季)/g, '').trim();
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- TMDB 搜索 ---
async function searchTMDB(showName) {
  if (!TMDB_API_KEY) return null;
  try {
    const cleanedName = cleanShowName(showName);
    const response = await axios.get(`${TMDB_BASE_URL}/search/multi`, {
      params: {
        query: cleanedName,
        language: 'zh-CN'
      },
      headers: {
        'Authorization': `Bearer ${TMDB_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    const data = response.data;
    if (data.results && data.results.length > 0) {
      const bestMatch = data.results[0];
      return {
        id: bestMatch.id,
        title: bestMatch.name || bestMatch.title,
        overview: bestMatch.overview,
        posterPath: bestMatch.poster_path 
          ? `https://image.tmdb.org/t/p/w500${bestMatch.poster_path}` 
          : null,
        rating: bestMatch.vote_average
      };
    }
    return null;
  } catch (error) {
    console.error(`[TMDB] 搜索失败 "${showName}": ${error.message}`);
    return null;
  }
}

// --- 抓取平台数据 ---
async function fetchPlatformData(platform, seriesType) {
  try {
    const today = new Date();
    const showDate = today.getFullYear() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');

    const url = `https://piaofang.maoyan.com/dashboard/webHeatData?showDate=${showDate}&seriesType=${seriesType}&platformType=${platform.value}`;
    
    const response = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT, "referer": "https://piaofang.maoyan.com/" },
      timeout: 10000
    });

    if (response.data?.dataList?.list) {
      const rawList = response.data.dataList.list.filter(item => item.seriesInfo?.name);
      const enhancedShows = [];

      for (const item of rawList.slice(0, 20)) { // 每个平台取前20名
        const originalName = item.seriesInfo.name;
        const cleanedName = cleanShowName(originalName);
        
        await delay(TMDB_REQUEST_DELAY);
        const tmdbData = await searchTMDB(cleanedName);

        // 核心修改：无论是否有 TMDB 数据，都保留猫眼数据
        enhancedShows.push({
          title: originalName,
          heat: item.heatScore,
          updown: item.heatUpdown,
          ...(tmdbData || { note: "no_tmdb_match" }) 
        });
      }
      return enhancedShows;
    }
    return [];
  } catch (error) {
    console.error(`[${platform.title}] 抓取失败:`, error.message);
    return [];
  }
}

// --- 主函数 ---
async function main() {
  console.log('🚀 开始更新猫眼数据...');
  
  const result = {
    last_updated: new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('Z', '+08:00'),
    tv: {},
    show: {}
  };

  // 串行执行，避免请求过快被封 IP
  for (const p of PLATFORMS) {
    result.tv[p.title] = await fetchPlatformData(p, '');    // 剧集
    result.show[p.title] = await fetchPlatformData(p, '2'); // 综艺
  }

  // 确保目录存在
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 保存数据
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`✅ 数据更新成功！文件大小: ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(2)} KB`);
}

main().catch(error => {
  console.error('❌ 脚本执行崩溃:', error);
  process.exit(1);
});
