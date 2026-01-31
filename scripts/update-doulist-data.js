import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 配置项 ---
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'doulist-data.json');

// 你可以替换为你喜欢的豆瓣豆列 ID
const DOULISTS = [
  { title: "豆瓣高分剧集", id: "1253915" },
  { title: "近期热门电影", id: "3763172" }
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- TMDB 搜索 (对齐格式) ---
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
        rating: Math.round(bestMatch.vote_average),
        mediaType: bestMatch.media_type || (bestMatch.name ? "tv" : "movie")
      };
    }
    return null;
  } catch (e) { return null; }
}

// --- 抓取豆瓣豆列 ---
async function fetchDoulist(doulist) {
  console.log(`正在抓取豆列: ${doulist.title}...`);
  try {
    const url = `https://www.douban.com/doulist/${doulist.id}/`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
        'Host': 'www.douban.com'
      }
    });

    // 简单的正则匹配豆瓣页面中的电影标题
    const titles = [...response.data.matchAll(/class="title">[\s\S]*?target="_blank">([\s\S]*?)<\/a>/g)]
      .map(m => m[1].trim())
      .slice(0, 12); // 每个豆列取前12个

    const results = [];
    for (const title of titles) {
      console.log(`  🔍 搜索详情: ${title}`);
      await delay(1000); // 豆瓣搜索要慢，否则会 403
      const tmdb = await searchTMDB(title);
      results.push(tmdb || { title, description: "豆瓣精选内容", type: "douban" });
    }
    return results;
  } catch (e) {
    console.error(`❌ 豆列 ${doulist.title} 抓取失败: ${e.message}`);
    return [];
  }
}

// --- 主函数 ---
async function main() {
  const result = {
    last_updated: new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('Z', '+08:00'),
    lists: {}
  };

  for (const dl of DOULISTS) {
    result.lists[dl.title] = await fetchDoulist(dl);
    await delay(2000); // 豆列之间增加停顿
  }

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`✅ 豆瓣数据更新成功: ${OUTPUT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
