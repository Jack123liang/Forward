WidgetMetadata = {
  id: "forward.combined.media.lists",
  title: "影视榜单",
  description: "影视动画榜单",
  author: "𝓑𝓾𝓽𝓽𝓮𝓻𝓯𝓵𝔂",
  site: "https://forward-eta.vercel.app",
  version: "1.5.1",
  requiredVersion: "0.0.2",
  detailCacheDuration: 60,
  modules: [
    // -------------TMDB模块-------------
    // --- 热门模块 ---
    {
      title: "TMDB 热门剧集",
      description: "今日热门电视剧",
      requiresWebView: false,
      functionName: "loadTodayHotTV",
      cacheDuration: 3600,
      params: [
        { name: "language", title: "语言", type: "language", value: "zh-CN" },
        { 
          name: "with_origin_country", // 修正为正确的地区参数名
          title: "地区", 
          type: "enumeration", 
          enumOptions: [
            { title: "全部地区", value: "" },
            { title: "中国", value: "CN" },
            { title: "美国", value: "US" },
            { title: "韩国", value: "KR" },
            { title: "日本", value: "JP" },
            { title: "英国", value: "GB" },
            { title: "泰国", value: "TH" },
            { title: "意大利", value: "IT" },
            { title: "德国", value: "DE" },
            { title: "西班牙", value: "ES" },
            { title: "俄罗斯", value: "RU" },
            { title: "瑞典", value: "SE" },
            { title: "巴西", value: "BR" },
            { title: "丹麦", value: "DK" },
            { title: "印度", value: "IN" },
            { title: "加拿大", value: "CA" },
            { title: "爱尔兰", value: "IE" },
            { title: "澳大利亚", value: "AU" }
          ], 
          value: "" 
        },
        {
          name: "sort_by", // 新增真正的排序参数
          title: "🔢 排序方式",
          type: "enumeration",
          description: "选择内容排序方式",
          value: "popularity.desc",
          enumOptions: [
            { title: "人气最高", value: "popularity.desc" },
            { title: "上映时间↓", value: "first_air_date.desc" },
            { title: "评分最高", value: "vote_average.desc" },
            { title: "最多投票", value: "vote_count.desc" }
          ]
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
          name: "with_origin_country", // 修正为正确的地区参数名
          title: "地区", 
          type: "enumeration", 
          enumOptions: [
            { title: "全部地区", value: "" },
            { title: "中国", value: "CN" },
            { title: "美国", value: "US" },
            { title: "韩国", value: "KR" },
            { title: "日本", value: "JP" },
            { title: "英国", value: "GB" },
            { title: "中国香港", value: "HK" },
            { title: "中国台湾", value: "TW" },
            { title: "泰国", value: "TH" },
            { title: "意大利", value: "IT" },
            { title: "德国", value: "DE" },
            { title: "西班牙", value: "ES" },
            { title: "俄罗斯", value: "RU" },
            { title: "瑞典", value: "SE" },
            { title: "巴西", value: "BR" },
            { title: "丹麦", value: "DK" },
            { title: "印度", value: "IN" },
            { title: "加拿大", value: "CA" },
            { title: "爱尔兰", value: "IE" },
            { title: "澳大利亚", value: "AU" }
          ], 
          value: "" 
        },
        {
          name: "sort_by", // 新增真正的排序参数
          title: "🔢 排序方式",
          type: "enumeration",
          description: "选择内容排序方式",
          value: "popularity.desc",
          enumOptions: [
            { title: "人气最高", value: "popularity.desc" },
            { title: "上映时间↓", value: "release_date.desc" },
            { title: "评分最高", value: "vote_average.desc" },
            { title: "最多投票", value: "vote_count.desc" }
          ]
        },
        { name: "page", title: "页码", type: "page" }
      ]
    },
    // ... 后续模块保持不变 (tmdbTopRated, tmdbDiscoverByNetwork等)
  ]
};

// --- 下面是配套的数据处理函数修改建议 (确保能读到新参数) ---

async function loadTodayHotTV(params = {}) {
    const { language = "zh-CN", with_origin_country = "", sort_by = "popularity.desc", page = 1 } = params;
    // 如果是“全部地区”，则优先从你的 JSON 读取 (带上时间戳防缓存)
    if (!with_origin_country) {
        const url = `https://forward-eta.vercel.app/data/TMDB_Trending.json?t=${Date.now()}`;
        const res = await Widget.http.get(url);
        return res.data.results;
    }
    // 否则调用标准的 discover 接口
    const api_key = "你的TMDB密钥"; 
    const url = `https://api.themoviedb.org/3/discover/tv?api_key=${api_key}&language=${language}&with_origin_country=${with_origin_country}&sort_by=${sort_by}&page=${page}`;
    const res = await Widget.http.get(url);
    return res.data.results;
}

async function loadTodayHotMovies(params = {}) {
    const { language = "zh-CN", with_origin_country = "", sort_by = "popularity.desc", page = 1 } = params;
    if (!with_origin_country) {
        const url = `https://forward-eta.vercel.app/data/TMDB_Trending.json?t=${Date.now()}`;
        const res = await Widget.http.get(url);
        // 确保过滤出 movie 类型
        return res.data.results.filter(i => i.media_type === "movie" || !i.media_type);
    }
    const api_key = "你的TMDB密钥";
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${api_key}&language=${language}&with_origin_country=${with_origin_country}&sort_by=${sort_by}&page=${page}`;
    const res = await Widget.http.get(url);
    return res.data.results;
}
