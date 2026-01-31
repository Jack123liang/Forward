import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'movies-data.json');

/**
 * 格式化电影数据，确保与原作者字段完全一致
 * 特别加入了 originalTitle
 */
const formatMovie = (m) => ({
  id: m.id,
  type: "tmdb",
  title: m.title || m.name,
  originalTitle: m.original_title || m.original_name, // 关键：对齐原作者字段
  description: m.overview || "暂无简介",
  posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
  backdropPath: m.backdrop_path ? `https://image.tmdb.org/t/p/w500${m.backdrop_path}` : null,
  releaseDate: m.release_date || m.first_air_date || "",
  rating: m.vote_average || 0,
  mediaType: "movie"
});

/**
 * 从 TMDB 获取院线数据
 * @param {string} endpoint - 'now_playing' 或 'upcoming'
 */
async function fetchTMDBMovies(endpoint) {
  if (!TMDB_API_KEY) {
    console.error("❌ 错误: 缺少 TMDB_API_KEY 环境参数");
    return [];
  }

  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${endpoint}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'zh-CN',
        region: 'CN', // 锁定中国地区院线
        page: 1
      },
      headers: {
        'Authorization': `Bearer ${TMDB_API_KEY}`
      }
    });

    // 过滤掉没有海报或没有简介的条目，保证 Widget 显示美观
    return response.data.results
      .filter(m => m.poster_path && m.overview)
      .slice(0, 20) 
      .map(formatMovie);
  } catch (e) {
    console.error(`❌ 获取 TMDB ${endpoint} 失败: ${e.message}`);
    return [];
  }
}

async function main() {
  console.log("🎬 正在同步 TMDB 院线电影数据...");

  // 生成北京时间戳
  const now = new Date();
  const offset = 8 * 60 * 60 * 1000; // 东八区
  const bjTime = new Date(now.getTime() + offset).toISOString().replace('Z', '+08:00');

  const result = {
    last_updated: bjTime,
    now_playing: await fetchTMDBMovies('now_playing'),
    upcoming: await fetchTMDBMovies('upcoming')
  };

  // 确保 data 目录存在
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 写入 JSON
  try {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
    console.log(`✅ 成功！数据已更新至: ${OUTPUT_PATH}`);
    console.log(`📊 正在上映: ${result.now_playing.length} 条`);
    console.log(`📊 即将上映: ${result.upcoming.length} 条`);
  } catch (err) {
    console.error("❌ 写入文件失败:", err);
  }
}

main().catch(e => {
  console.error("🚀 脚本运行崩溃:", e);
  process.exit(1);
});
