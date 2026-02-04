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
        { 
          name: "region", title: "地区", type: "enumeration", 
          enumOptions: [
            { title: "全部", value: "" }, { title: "中国", value: "CN" }, { title: "美国", value: "US" },
            { title: "韩国", value: "KR" }, { title: "日本", value: "JP" }, { title: "港台", value: "HK,TW" }
          ], value: "" 
        },
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
    },
    {
        title: "播出平台筛选",
        functionName: "tmdbDiscoverByNetwork",
        params: [
            {
                name: "with_networks", title: "平台", type: "enumeration", value: "213",
                enumOptions: [
                    { title: "Netflix", value: "213" }, { title: "Disney+", value: "2739" }, { title: "HBO", value: "49" },
                    { title: "Apple TV+", value: "2552" }, { title: "腾讯视频", value: "2007" }, { title: "爱奇艺", value: "1330" }
                ]
            },
            { name: "page", title: "页码", type: "page" }
        ]
    }
  ]
};

/**
 * 核心逻辑：这里优先使用播放器内置的 tmdb 接口
 * 如果你想强制使用你自己的 Vercel，请把下面的 USE_VERCEL 改为 true
 */
const USE_VERCEL = false; 
const MY_PROXY = "https://forward-eta.vercel.app/api/tmdb";

async function fetchData(apiPath, params) {
    if (USE_VERCEL) {
        // 方案 A: 走你的 Vercel 代理
        const url = `${MY_PROXY}/${apiPath}?${serialize(params)}`;
        const res = await Widget.http.get(url);
        return formatTMDBData(res.data.results || res.data);
    } else {
        // 方案 B: 走播放器原生接口 (根据你的日志，这是最稳的)
        const res = await Widget.tmdb(apiPath, params);
        return formatTMDBData(res.results || res);
    }
}

async function loadTodayHotTV(params) {
    return await fetchData("trending/tv/day", params);
}

async function loadTodayHotMovies(params) {
    return await fetchData("trending/movie/day", params);
}

async function tmdbDiscoverByNetwork(params) {
    return await fetchData("discover/tv", params);
}

// 辅助函数：格式化
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

function serialize(obj) {
    return Object.keys(obj).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`).join('&');
}
