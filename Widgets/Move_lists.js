WidgetMetadata = {
  id: "Move_lists_Pro",
  title: "影视榜单 (Pro 解锁版)",
  description: "整合2.0新功能 + 1.5旧版榜单 | 移除白名单限制",
  author: "Modified",
  site: "https://for-ward.vercel.app",
  version: "2.1.0",
  requiredVersion: "0.0.2",
  detailCacheDuration: 60,
  modules: [
    // --- 热门模块 (2.0 增强版) ---
    {
      title: "TMDB 热门剧集",
      functionName: "loadTodayHotTV",
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
    // --- 2.0 新增：播出平台筛选 ---
    {
      title: "TMDB 播出平台",
      functionName: "tmdbDiscoverByNetwork",
      params: [
        {
          name: "with_networks", title: "平台", type: "enumeration",
          enumOptions: [
            { title: "Netflix", value: "213" }, { title: "Disney+", value: "2739" }, { title: "HBO", value: "49" },
            { title: "Apple TV+", value: "2552" }, { title: "Tencent", value: "2007" }, { title: "iQiyi", value: "1330" }
          ], value: "213"
        },
        { name: "page", title: "页码", type: "page" }
      ]
    },
    // --- 1.5 经典：豆瓣模块 ---
    {
      title: "豆瓣 热门电影",
      functionName: "loadEnhancedItemsFromApi",
      params: [{ name: "url", type: "string", value: "https://frodo.douban.com/api/v2/subject_collection/movie_hotgauss/items" }]
    },
    {
      title: "豆瓣 热门剧集",
      functionName: "loadEnhancedItemsFromApi",
      params: [{ name: "url", type: "string", value: "https://frodo.douban.com/api/v2/subject_collection/tv_hot/items" }]
    }
  ]
};

/**************** 后端处理逻辑 ****************/

// 统一 API 请求封装
async function request(path, query = {}) {
    const queryString = Object.entries(query).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const url = `https://for-ward.vercel.app/api/tmdb${path}?${queryString}`;
    const res = await Widget.http.get(url);
    if (!res.data || !res.data.results) return [];
    return res.data.results.map(item => ({
        title: item.title || item.name,
        image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        description: item.overview || `评分: ${item.vote_average}`,
        rating: item.vote_average,
        id: item.id,
        type: item.title ? "movie" : "tv"
    }));
}

// 对应 Metadata 中的各函数
async function loadTodayHotTV(params) {
    return await request("/trending/tv/day", { language: params.language, page: params.page, region: params.sort_by });
}

async function loadTodayHotMovies(params) {
    return await request("/trending/movie/day", { language: params.language, page: params.page, region: params.sort_by });
}

async function tmdbDiscoverByNetwork(params) {
    return await request("/discover/tv", { with_networks: params.with_networks, page: params.page, language: "zh-CN" });
}

// 豆瓣 API 处理逻辑
async function loadEnhancedItemsFromApi(params) {
    const res = await Widget.http.get(params.url, {
        headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15" }
    });
    return res.data.subject_collection_items.map(item => ({
        title: item.title,
        image: item.cover.url,
        description: item.card_subtitle,
        rating: item.rating ? item.rating.value : "N/A",
        type: "multi"
    }));
}
