import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 配置项 ---
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
const TMDB_API_KEY = process.env.TMDB_API_KEY; 
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

// --- TMDB 搜索 (对齐原作者字段) ---
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
        type: "tmdb",
        title: bestMatch.name || bestMatch.title,
        description: bestMatch.overview, // 对齐原作者字段
        posterPath: bestMatch.poster_path 
          ? `https://image.tmdb.org/t/p/w500${bestMatch.poster_path}` 
          : null,
        backdropPath: bestMatch.backdrop_path 
          ? `https://image.tmdb.org/t/p/w500${bestMatch.backdrop_path}` 
          : null, // 补全背景图
        releaseDate: bestMatch.first_air_date || bestMatch.release_date, // 补全日期
        rating: Math.round(bestMatch.vote_average), 
        mediaType: bestMatch.media_type || (bestMatch.name ? "tv" : "movie") // 补全类型
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

      for (const item of rawList.slice(0, 15)) { 
        const originalName = item.seriesInfo.name;
        const cleanedName = cleanShowName(originalName);
        
        await delay(TMDB_REQUEST_DELAY);
        const tmdbData = await searchTMDB(cleanedName);

        // 如果 TMDB 有数据则使用，没有则创建保底数据
        if (tmdbData) {
            enhancedShows.push(tmdbData);
        } else {
            enhancedShows.push({
                title: originalName,
                description: "暂无简介",
                type: "maoyan",
                note: "no_tmdb_match"
            });
        }
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
  console.log('🚀 开始更新猫眼数据 (对齐原作者格式)...');
  
  const result = {
    // 格式化时间戳
    last_updated: new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('Z', '+08:00'),
    tv: {},
    show: {}
  };

  for (const p of PLATFORMS) {
    result.tv[p.title] = await fetchPlatformData(p, '');    
    result.show[p.title] = await fetchPlatformData(p, '2'); 
  }

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`✅ 格式对齐成功！文件已存至: ${OUTPUT_PATH}`);
}

main().catch(error => {
  console.error('❌ 脚本执行崩溃:', error);
  process.exit(1);
});
