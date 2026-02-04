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

// 这里的 functionName 对应官方文档推荐的调用方式
async function loadTodayHotTV(params) {
    // 使用内置函数，它会自动读取你在设置里填写的 API 地址和 Key
    const res = await Widget.tmdb("trending/tv/day", params);
    return formatData(res.results, "tv");
}

async function loadTodayHotMovies(params) {
    const res = await Widget.tmdb("trending/movie/day", params);
    return formatData(res.results, "movie");
}

function formatData(items, type) {
    if (!items) return [];
    // 图片仍然走你的代理以确保显示
    const IMG_BASE = "https://forward-eta.vercel.app/t/p/w500";
    
    return items.map(item => ({
        id: `${type}.${item.id}`, // 官方规范 ID
        title: item.title || item.name,
        posterPath: item.poster_path ? `${IMG_BASE}${item.poster_path}` : "",
        backdropPath: item.backdrop_path ? `${IMG_BASE}${item.backdrop_path}` : "",
        rating: item.vote_average ? item.vote_average.toString() : "0",
        mediaType: type,
        type: "tmdb" // 标记为原生 TMDB 类型
    }));
}
