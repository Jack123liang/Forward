WidgetMetadata = {
  id: "Move_lists_unlocked",
  title: "影视榜单",
  description: "影视榜单排行",
  author: "Gemini",
  site: "https://forward-eta.vercel.app",
  version: "2.0.0",
  requiredVersion: "0.0.2",
  detailCacheDuration: 60,
  modules: [
    {
      title: "TMDB 热门剧集",
      functionName: "loadTodayHotTV",
      params: [
        { name: "language", title: "语言", type: "language", value: "zh-CN" },
        { name: "page", title: "页码", type: "page" }
      ]
    },
    {
      title: "TMDB 热门电影",
      functionName: "loadTodayHotMovies",
      params: [
        { name: "language", title: "语言", type: "language", value: "zh-CN" },
        { name: "page", title: "页码", type: "page" }
      ]
    }
  ]
};

// 基础配置
const PROXY_BASE = "https://forward-eta.vercel.app/api/tmdb";

async function loadTodayHotTV(params) {
    const url = `${PROXY_BASE}/trending/tv/day?language=${params.language}&page=${params.page}`;
    const res = await Widget.http.get(url);
    // 这里增加一个容错检查
    const data = res.data.results || res.data;
    return formatTMDBData(data);
}

async function loadTodayHotMovies(params) {
    const url = `${PROXY_BASE}/trending/movie/day?language=${params.language}&page=${params.page}`;
    const res = await Widget.http.get(url);
    const data = res.data.results || res.data;
    return formatTMDBData(data);
}

function formatTMDBData(items) {
    if (!items || !Array.isArray(items)) return [];
    return items.map(item => ({
        title: item.title || item.name,
        image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
        description: item.overview || "暂无简介",
        rating: item.vote_average || 0,
        id: item.id,
        type: item.title ? "movie" : "tv"
    }));
}
