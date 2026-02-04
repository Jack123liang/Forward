WidgetMetadata = {
  id: "Move_lists_unlocked",
  title: "影视榜单",
  description: "影视榜单排行",
  author: "Gemini",
  site: "https://forward-eta.vercel.app",
  version: "2.0.0",
  requiredVersion: "0.0.2",
  modules: [
    {
      title: "TMDB 热门剧集",
      functionName: "loadTodayHotTV",
      params: [{ name: "language", title: "语言", type: "language", value: "zh-CN" }, { name: "page", title: "页码", type: "page" }]
    },
    {
      title: "TMDB 热门电影",
      functionName: "loadTodayHotMovies",
      params: [{ name: "language", title: "语言", type: "language", value: "zh-CN" }, { name: "page", title: "页码", type: "page" }]
    }
  ]
};

// 你的 Vercel 代理地址
const MY_PROXY = "https://forward-eta.vercel.app/3";

async function loadTodayHotTV(params) {
    const url = `${MY_PROXY}/trending/tv/day?language=${params.language}&page=${params.page}`;
    const res = await Widget.http.get(url);
    return formatData(res.data.results, "tv");
}

async function loadTodayHotMovies(params) {
    const url = `${MY_PROXY}/trending/movie/day?language=${params.language}&page=${params.page}`;
    const res = await Widget.http.get(url);
    return formatData(res.data.results, "movie");
}

function formatData(items, type) {
    if (!items) return [];
    
    // 关键点：使用你的 Vercel 作为图片代理，解决国内不显图的问题
    const IMG_BASE = "https://forward-eta.vercel.app/t/p/w500";

    return items.map(item => {
        return {
            id: `${type}.${item.id}`, // 官方要求的 ID 格式
            title: item.title || item.name,
            // 开发者文档要求的字段名
            posterPath: item.poster_path ? `${IMG_BASE}${item.poster_path}` : "", 
            backdropPath: item.backdrop_path ? `${IMG_BASE}${item.backdrop_path}` : "",
            rating: item.vote_average ? item.vote_average.toString() : "0",
            releaseDate: item.release_date || item.first_air_date,
            description: item.overview,
            mediaType: type,
            type: "tmdb" 
        };
    });
}

