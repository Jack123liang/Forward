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
const TMDB_API_KEY = "6358fd374e1372bd48effd9e21521917";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const DEFAULT_LANGUAGE = "zh-CN";

// 通用请求函数
async function fetchTMDB(endpoint, params = {}) {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    params.api_key = TMDB_API_KEY;
    params.language = params.language || DEFAULT_LANGUAGE;

    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    try {
        const response = await fetch(url.toString());
        const data = await response.json();
        return data;
    } catch (err) {
        console.error("TMDB请求失败:", err);
        return null;
    }
}

// 数据映射
function mapMoviesToForward(movies) {
    return movies.map(movie => ({
        title: movie.title || movie.name,
        description: movie.overview,
        poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : "",
        movieId: movie.id,
        type: "movie"
    }));
}

// 热门电影
async function loadTodayHotMovies(region = "", page = 1) {
    const data = await fetchTMDB("/trending/movie/day", { region, page });
    if (!data || !data.results) return [];
    return mapMoviesToForward(data.results);
}

// 排行榜
async function loadTopRatedMovies(region = "", page = 1) {
    const data = await fetchTMDB("/movie/top_rated", { region, page });
    if (!data || !data.results) return [];
    return mapMoviesToForward(data.results);
}

// 分类
const GENRES = {
    comedy: 35,
    action: 28,
    drama: 18,
    romance: 10749
};

const LANGUAGES = {
    korea: "ko",
    japan: "ja",
    china: "zh",
    usa: "en"
};

async function loadMoviesByType(genre, language = "", page = 1) {
    const params = { page };
    if (GENRES[genre]) params.with_genres = GENRES[genre];
    if (LANGUAGES[language]) params.with_original_language = LANGUAGES[language];

    const data = await fetchTMDB("/discover/movie", params);
    if (!data || !data.results) return [];
    return mapMoviesToForward(data.results);
}

// Forward UI 配置
const forwardUI = [
    {
        title: "TMDB 热门电影",
        description: "今日热门电影",
        requiresWebView: false,
        functionName: "loadTodayHotMovies",
        cacheDuration: 3600,
        params: [
            { name: "region", title: "地区", type: "enumeration", enumOptions: [
                { title: "全部地区", value: "" },
                { title: "中国", value: "CN" },
                { title: "美国", value: "US" },
                { title: "韩国", value: "KR" },
                { title: "日本", value: "JP" }
            ], value: "" },
            { name: "page", title: "页码", type: "page" }
        ]
    },
    {
        title: "TMDB 排行榜",
        description: "高评分电影",
        requiresWebView: false,
        functionName: "loadTopRatedMovies",
        cacheDuration: 3600,
        params: [
            { name: "region", title: "地区", type: "enumeration", enumOptions: [
                { title: "全部地区", value: "" },
                { title: "中国", value: "CN" },
                { title: "美国", value: "US" },
                { title: "韩国", value: "KR" },
                { title: "日本", value: "JP" }
            ], value: "" },
            { name: "page", title: "页码", type: "page" }
        ]
    },
    {
        title: "按类型分类",
        description: "喜剧、动作、韩剧、日剧等",
        requiresWebView: false,
        functionName: "loadMoviesByType",
        cacheDuration: 3600,
        params: [
            { name: "genre", title: "类型", type: "enumeration", enumOptions: [
                { title: "喜剧", value: "comedy" },
                { title: "动作", value: "action" },
                { title: "剧情", value: "drama" },
                { title: "爱情", value: "romance" }
            ], value: "comedy" },
            { name: "language", title: "语言", type: "enumeration", enumOptions: [
                { title: "韩国", value: "korea" },
                { title: "日本", value: "japan" },
                { title: "中国", value: "china" },
                { title: "美国", value: "usa" }
            ], value: "korea" },
            { name: "page", title: "页码", type: "page" }
        ]
    }
];
