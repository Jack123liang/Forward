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
      description: "今日热门电视剧",
      requiresWebView: false,
      functionName: "loadTodayHotTV",
      cacheDuration: 3600,
      params: [
        { name: "language", title: "语言", type: "language", value: "zh-CN" },
        { 
          name: "sort_by", title: "地区", type: "enumeration", 
          enumOptions: [
            { title: "全部", value: "" }, { title: "中国", value: "CN" }, { title: "美国", value: "US" },
            { title: "韩国", value: "KR" }, { title: "日本", value: "JP" }, { title: "中国香港", value: "HK" }, { title: "中国台湾", value: "TW" }
          ], value: "" 
        },
        { name: "page", title: "页码", type: "page" }
      ]
    },
    {
      title: "TMDB 热门电影",
      description: "今日热门电影",
      requiresWebView: false,
      functionName: "loadTodayHotMovies",
      cacheDuration: 3600,
      params: [
        { name: "language", title: "语言", type: "language", value: "zh-CN" },
        { 
          name: "sort_by", title: "地区", type: "enumeration", 
          enumOptions: [
            { title: "全部", value: "" }, { title: "中国", value: "CN" }, { title: "美国", value: "US" },
            { title: "中国香港", value: "HK" }, { title: "中国台湾", value: "TW" }, { title: "韩国", value: "KR" }
          ], value: "" 
        },
        { name: "page", title: "页码", type: "page" }
      ]
    },
    {
        title: "TMDB 播出平台",
        description: "按播出平台筛选剧集内容",
        requiresWebView: false,
        functionName: "tmdbDiscoverByNetwork",
        cacheDuration: 3600,
        params: [
            {
                name: "with_networks", title: "播出平台", type: "enumeration", value: "",
                enumOptions: [
                    { title: "Netflix", value: "213" }, { title: "Disney+", value: "2739" }, { title: "HBO", value: "49" },
                    { title: "Tencent", value: "2007" }, { title: "iQiyi", value: "1330" }, { title: "Youku", value: "1419" },
                    { title: "Bilibili", value: "1605" }, { title: "Apple TV+", value: "2552" }
                ]
            },
            { name: "page", title: "页码", type: "page" }
        ]
    }
  ]
};

/**
 * 后端逻辑函数 - 已指向你的私人域名 forward-eta
 */

async function loadTodayHotTV(params) {
    const { language, sort_by, page } = params;
    const url = `https://forward-eta.vercel.app/api/tmdb/trending/tv/day?language=${language}&page=${page}&region=${sort_by}`;
    const res = await Widget.http.get(url);
    return formatTMDBData(res.data.results);
}

async function loadTodayHotMovies(params) {
    const { language, sort_by, page } = params;
    const url = `https://forward-eta.vercel.app/api/tmdb/trending/movie/day?language=${language}&page=${page}&region=${sort_by}`;
    const res = await Widget.http.get(url);
    return formatTMDBData(res.data.results);
}

async function tmdbDiscoverByNetwork(params) {
    const { with_networks, page, language = "zh-CN" } = params;
    const url = `https://forward-eta.vercel.app/api/tmdb/discover/tv?with_networks=${with_networks}&page=${page}&language=${language}`;
    const res = await Widget.http.get(url);
    return formatTMDBData(res.data.results);
}

// 辅助函数：统一数据格式
function formatTMDBData(items) {
    if (!items) return [];
    return items.map(item => ({
        title: item.title || item.name,
        image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        description: item.overview,
        rating: item.vote_average,
        id: item.id,
        type: item.media_type || (item.title ? "movie" : "tv")
    }));
}
