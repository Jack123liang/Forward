import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'movies-data.json');

// --- 工具函数：格式化 TMDB 结果 ---
const formatMovie = (m) => ({
  id: m.id,
  type: "tmdb",
  title: m.title || m.name,
  description: m.overview,
  posterPath: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
  backdropPath: m.backdrop_path ? `https://image.tmdb.org/t/p/w500${m.backdrop_path}` : null,
  releaseDate: m.release_date || m.first_air_date,
  rating: m.vote_average,
  mediaType: "movie"
});

async function fetchTMDBMovies(endpoint) {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${endpoint}`, {
      params: {
        api_key: TMDB_API_KEY, // 兼容某些环境中不带 Bearer 的情况
        language: 'zh-CN',
        region: 'CN',
        page: 1
      },
      headers: {
        'Authorization': `Bearer ${TMDB_API_KEY}`
      }
    });
    return response.data.results.slice(0, 15).map(formatMovie);
  } catch (e) {
    console.error(`❌ 获取 ${endpoint} 失败: ${e.message}`);
    return [];
  }
}

async function main() {
  console.log("🎬 正在从 TMDB 抓取院线电影数据...");

  if (!TMDB_API_KEY) {
    console.error("❌ 缺少 TMDB_API_KEY，请在 GitHub Secrets 中配置");
    process.exit(1);
  }

  const result = {
    last_updated: new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('Z', '+08:00'),
    now_playing: await fetchTMDBMovies('now_playing'),
    upcoming: await fetchTMDBMovies('upcoming')
  };

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`✅ 院线电影数据更新成功！存至: ${OUTPUT_PATH}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
