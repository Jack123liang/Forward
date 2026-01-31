import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'doulist-data.json');

// 使用原作者的豆列 ID
const DOULISTS = [
  { id: "526461", name: "惊悚恐怖片" }
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
        rating: bestMatch.vote_average,
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cookie': 'bid=' + Math.random().toString(36).substring(2, 13) // 伪造简单 Cookie
      },
      timeout: 15000
    });

    const html = response.data;
    // 更加兼容的正则匹配
    const titleRegex = /class="title">\s*<a[^>]*target="_blank"[^>]*>\s*([\s\S]*?)\s*<\/a>/g;
    const titles = [...html.matchAll(titleRegex)]
      .map(m => m[1].trim())
      .filter(t => t.length > 0)
      .slice(0, 10);

    console.log(`找到了 ${titles.length} 个电影标题`);

    if (titles.length === 0) {
      // 如果抓取失败，输出 HTML 前 200 字用于排查
      console.log("HTML 内容片段:", html.substring(0, 200));
    }

    const shows = [];
    for (const title of titles) {
      await delay(1500); 
      const tmdb = await searchTMDB(title);
      if (tmdb) {
        shows.push(tmdb);
      } else {
        // 保底：即使 TMDB 搜不到，也保留名字
        shows.push({ title: title, type: "douban", description: "暂无详情" });
      }
    }
    return { name: dlInfo.name, shows: shows };
  } catch (e) {
    console.error(`❌ 网络请求失败: ${e.message}`);
    return null;
  }
}

async function main() {
  const finalData = {};
  for (const dl of DOULISTS) {
    const data = await fetchDoulist(dl);
    if (data && data.shows.length > 0) {
      finalData[dl.id] = data;
    }
  }

  // 如果最终没抓到数据，不要存空文件，存一个占位提示
  if (Object.keys(finalData).length === 0) {
    console.log("⚠️ 未抓取到任何数据，可能是被豆瓣屏蔽了。");
    return; // 结束执行，不覆盖原文件
  }

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalData, null, 2));
  console.log(`✅ 豆瓣数据更新成功！`);
}

main().catch(e => { console.error(e); process.exit(1); });
