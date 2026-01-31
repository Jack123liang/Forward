import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'theater-data.json');

// --- 剧场剧集配置清单 (在这里添加新剧名) ---
const THEATER_CONFIG = {
  "迷雾剧场": {
    aired: ["有罪之身", "树影迷宫", "隐秘的角落", "沉默的真相", "回来的女儿", "尘封十三载"],
    upcoming: ["二十一天", "正当防卫"]
  },
  "白夜剧场": {
    aired: ["白夜追凶", "重生之门", "边水往事", "雪迷宫"],
    upcoming: ["白夜破晓"]
  },
  "季风剧场": {
    aired: ["猎罪图鉴", "我在他乡挺好的", "消失的孩子"],
    upcoming: []
  },
  "X剧场": {
    aired: ["漫长的季节", "欢颜", "繁城之下"],
    upcoming: []
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, 1000));

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
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log("🚀 开始更新剧场专题数据...");
  
  const result = {
    last_updated: new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('Z', '+08:00'),
  };

  for (const [theaterName, lists] of Object.entries(THEATER_CONFIG)) {
    console.log(`📡 处理: ${theaterName}`);
    result[theaterName] = {
      aired: [],
      upcoming: []
    };

    // 处理已播出的
    for (const title of lists.aired) {
      const data = await searchTMDB(title);
      if (data) result[theaterName].aired.push(data);
      await delay(500);
    }

    // 处理待播出的
    for (const title of lists.upcoming) {
      const data = await searchTMDB(title);
      if (data) result[theaterName].upcoming.push(data);
      await delay(500);
    }
    
    // 补充统计字段
    result[theaterName].totalItems = result[theaterName].aired.length + result[theaterName].upcoming.length;
    result[theaterName].totalPages = 1; 
  }

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`✅ 剧场数据更新成功！存至: ${OUTPUT_PATH}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
