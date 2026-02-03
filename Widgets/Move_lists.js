WidgetMetadata = {
  id: "Move_lists",
  title: "影视榜单",
  description: "白名单用户独享模块",
  author: "𝓑𝓾𝓽𝓽𝓮𝓻𝓯𝓵𝔂",
  site: "https://for-ward.vercel.app",
  version: "2.0.0",
  requiredVersion: "0.0.2",
  detailCacheDuration: 60,
  modules: [    
export default = [
  // ======================
  // 今日热门电影
  // ======================
  {
    title: "TMDB 热门电影",
    description: "今日热门电影 / 热门分类快捷按钮",
    requiresWebView: false,
    functionName: "loadTodayHotMovies",
    cacheDuration: 3600,
    quickOptions: [
      { title: "喜剧", value: "35" },
      { title: "动作", value: "28" },
      { title: "科幻", value: "878" },
      { title: "动画", value: "16" }
    ],
    params: [
      {
        name: "language",
        title: "语言",
        type: "enumeration",
        enumOptions: [
          { title: "中文", value: "zh-CN" },
          { title: "英文", value: "en-US" },
          { title: "日语", value: "ja-JP" },
          { title: "韩语", value: "ko-KR" }
        ],
        value: "zh-CN"
      },
      {
        name: "region",
        title: "地区",
        type: "enumeration",
        enumOptions: [
          { title: "全部地区", value: "" },
          { title: "中国", value: "CN" },
          { title: "美国", value: "US" },
          { title: "韩国", value: "KR" },
          { title: "日本", value: "JP" },
          { title: "英国", value: "GB" },
          { title: "香港", value: "HK" },
          { title: "台湾", value: "TW" },
          { title: "澳大利亚", value: "AU" }
        ],
        value: ""
      },
      { name: "page", title: "页码", type: "page" }
    ]
  },

  // ======================
  // 今日热门电视剧
  // ======================
  {
    title: "TMDB 热门电视剧",
    description: "今日热门电视剧 / 热门分类快捷按钮",
    requiresWebView: false,
    functionName: "loadTodayHotTV",
    cacheDuration: 3600,
    quickOptions: [
      { title: "韩剧", value: "KR" },
      { title: "日剧", value: "JP" },
      { title: "喜剧", value: "35" },
      { title: "剧情", value: "18" }
    ],
    params: [
      {
        name: "language",
        title: "语言",
        type: "enumeration",
        enumOptions: [
          { title: "中文", value: "zh-CN" },
          { title: "英文", value: "en-US" },
          { title: "日语", value: "ja-JP" },
          { title: "韩语", value: "ko-KR" }
        ],
        value: "zh-CN"
      },
      {
        name: "region",
        title: "地区",
        type: "enumeration",
        enumOptions: [
          { title: "全部地区", value: "" },
          { title: "中国", value: "CN" },
          { title: "韩国", value: "KR" },
          { title: "日本", value: "JP" },
          { title: "美国", value: "US" }
        ],
        value: ""
      },
      { name: "page", title: "页码", type: "page" }
    ]
  },

  // ======================
  // 电影排行榜
  // ======================
  {
    title: "TMDB 电影排行榜",
    description: "按类型、年份、评分查看电影排行",
    requiresWebView: false,
    functionName: "loadMovieRank",
    cacheDuration: 3600,
    quickOptions: [
      { title: "热门", value: "popularity.desc" },
      { title: "评分", value: "vote_average.desc" },
      { title: "最新", value: "release_date.desc" }
    ],
    params: [
      {
        name: "genre",
        title: "类型",
        type: "enumeration",
        enumOptions: [
          { title: "全部类型", value: "" },
          { title: "动作", value: "28" },
          { title: "喜剧", value: "35" },
          { title: "爱情", value: "10749" },
          { title: "恐怖", value: "27" },
          { title: "科幻", value: "878" },
          { title: "动画", value: "16" }
        ],
        value: ""
      },
      { name: "year", title: "年份", type: "string", value: "" },
      {
        name: "sort_by",
        title: "排序方式",
        type: "enumeration",
        enumOptions: [
          { title: "热门", value: "popularity.desc" },
          { title: "评分", value: "vote_average.desc" },
          { title: "最新", value: "release_date.desc" }
        ],
        value: "popularity.desc"
      },
      { name: "page", title: "页码", type: "page" }
    ]
  },

  // ======================
  // 电视剧排行榜
  // ======================
  {
    title: "TMDB 电视剧排行榜",
    description: "按类型、年份、评分查看电视剧排行",
    requiresWebView: false,
    functionName: "loadTVRank",
    cacheDuration: 3600,
    quickOptions: [
      { title: "热门", value: "popularity.desc" },
      { title: "评分", value: "vote_average.desc" },
      { title: "最新", value: "first_air_date.desc" }
    ],
    params: [
      {
        name: "genre",
        title: "类型",
        type: "enumeration",
        enumOptions: [
          { title: "全部类型", value: "" },
          { title: "动作", value: "10759" },
          { title: "喜剧", value: "35" },
          { title: "剧情", value: "18" },
          { title: "科幻&奇幻", value: "10765" },
          { title: "韩剧", value: "KR" },
          { title: "日剧", value: "JP" }
        ],
        value: ""
      },
      { name: "first_air_date_year", title: "年份", type: "string", value: "" },
      {
        name: "sort_by",
        title: "排序方式",
        type: "enumeration",
        enumOptions: [
          { title: "热门", value: "popularity.desc" },
          { title: "评分", value: "vote_average.desc" },
          { title: "最新", value: "first_air_date.desc" }
        ],
        value: "popularity.desc"
      },
      { name: "page", title: "页码", type: "page" }
    ]
  },

  // ======================
  // 搜索功能
  // ======================
  {
    title: "搜索电影/电视剧",
    description: "输入关键词搜索电影或电视剧",
    requiresWebView: false,
    functionName: "searchMovieOrTV",
    cacheDuration: 600,
    params: [
      { name: "query", title: "关键词", type: "string", value: "" },
      {
        name: "media_type",
        title: "类型",
        type: "enumeration",
        enumOptions: [
          { title: "全部", value: "" },
          { title: "电影", value: "movie" },
          { title: "电视剧", value: "tv" }
        ],
        value: ""
      },
      {
        name: "language",
        title: "语言",
        type: "enumeration",
        enumOptions: [
          { title: "中文", value: "zh-CN" },
          { title: "英文", value: "en-US" },
          { title: "日语", value: "ja-JP" },
          { title: "韩语", value: "ko-KR" }
        ],
        value: "zh-CN"
      },
      { name: "page", title: "页码", type: "page" }
    ]
  }
];
