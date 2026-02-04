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
          name: "region", title: "地区", type: "enumeration", 
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
          name: "region", title: "地区", type: "enumeration", 
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
                name: "with_networks", title: "播出平台", type: "enumeration", value: "213",
                enumOptions: [
                    { title: "Netflix", value: "213" }, { title: "Disney+", value: "2739" }, { title: "HBO", value: "49" },
                    { title: "Apple TV+", value: "2552" }, { title: "腾讯视频", value: "2007" }, { title: "爱奇艺", value: "1330" }, { title: "优酷", value: "1419" }, { title: "Bilibili", value: "1605" }
                ]
            },
            { name: "page", title: "页码", type: "page" }
        ]
    }
  ]
};

// --- 配置区 ---
const PROXY_BASE = "https://forward-eta.vercel.app";

// --- 逻辑区 ---

async function loadTodayHotTV(params) {
    const { language, region, page } = params;
    // 路径改为对齐测试成功的 /3/trending
    const url = `${PROXY_BASE}/3/trending/tv/day?language=${language}&page=${page}&region=${region || ''}`;
    const res = await Widget.http.get(url);
    return formatTMDBData(res.data.results);
}

async function loadTodayHotMovies(params) {
    const { language, region, page } = params;
    const url = `${PROXY_BASE}/3/trending/movie/day?language=${language}&page=${page}&region=${region || ''}`;
    const res = await Widget.http.get(url);
    return formatTMDBData(res.data.results);
}

async function tmdbDiscoverByNetwork(params) {
    const { with_networks, page, language = "zh-CN" } = params;
    // 发现页路径
    const url = `${PROXY_BASE}/3/discover/tv?with_networks=${with_networks}&page=${page}&language=${language}`;
    const res = await Widget.http.get(url);
    return formatTMDBData(res.data.results);
}

// 辅助函数：统一数据格式
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
