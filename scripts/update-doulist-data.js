import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'doulist-data.json');

// --- 这里的 ID 必须是你要抓取的豆瓣豆列 ID ---
const DOULISTS = [
  { id: "526461", name: "惊悚恐怖片" },
  { id: "1253915", name: "豆瓣高分剧集" } 
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function searchTMDB(title) {
  if (!TMDB_API_KEY) return null;
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/search/multi`, {
      params: { query: title, language: 'zh-CN' },
      headers: { 'Authorization': `Bearer ${TMDB_API_KEY}` }
    });
    const bestMatch = response.data.results?.[0];
    if (bestMatch) {
      return {
        id: bestMatch.id,
        type: "tmdb",
        title: bestMatch.name || bestMatch.title,
        description: bestMatch.overview,
        posterPath: bestMatch.poster_path ? `https://image.tmdb.org/t/p/w500${bestMatch.poster_path}` : null,
        backdropPath: bestMatch.backdrop_path ? `https://image.tmdb.org/t/p/w500${bestMatch.backdrop_path}` : null,
        releaseDate: bestMatch.first_air_date || bestMatch.release_date,
        rating: bestMatch.vote_average, // 保持原作者的小数格式
        mediaType: bestMatch.media_type || (bestMatch.name ? "tv" : "movie")
      };
    }
    return null;
  } catch (e) { return null; }
}

async function fetchDoulist(dlInfo) {
  console.log(`正在抓取豆列: ${dlInfo.name} (${dlInfo.id})...`);
  try {
    const url = `https://www.douban.com/doulist/${dlInfo.id}/`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    // 匹配豆瓣标题
    const titles = [...response.data.matchAll(/class="title">[\s\S]*?target="_blank">([\s\S]*?)<\/a>/g)]
      .map(m => m[1].trim())
      .slice(0, 15); 

    const shows = [];
    for (const title of titles) {
      console.log(`  🔍 匹配 TMDB: ${title}`);
      await delay(1000); 
      const tmdb = await searchTMDB(title);
      if (tmdb) {
        shows.push(tmdb);
      }
    }
    return {
      name: dlInfo.name,
      shows: shows
    };
  } catch (e) {
    console.error(`❌ 抓取失败: ${e.message}`);
    return null;
  }
}

async function main() {
  const finalData = {};

  for (const dl of DOULISTS) {
    const data = await fetchDoulist(dl);
    if (data) {
      // 按照原作者格式：以 ID 为 Key
      finalData[dl.id] = data;
    }
    await delay(3000); 
  }

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalData, null, 2));
  console.log(`✅ 豆瓣数据对齐成功！`);
}

main().catch(e => { console.error(e); process.exit(1); });
