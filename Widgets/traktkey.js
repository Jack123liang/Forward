WidgetMetadata = {
    id: "trakt_sam_666",
    title: "Trakt 追剧日历",
    author: "Jackie",
    description: "追剧日历、待看、收藏及历史记录",
    version: "1.0.0", // 修复 Widget.showToast 问题
    requiredVersion: "0.0.1",
    site: "https://trakt.tv",

    globalParams: [
        { name: "traktUser", title: "Trakt 用户名 (必填)", type: "input", value: "" },

        {
            name: "authMode",
            title: "认证模式",
            type: "enumeration",
            value: "public",
            enumOptions: [
                { title: "🔓 只读（无需登录）", value: "public" },
                { title: "🔐 OAuth 登录", value: "oauth" }
            ]
        },

        {
            name: "accessToken",
            title: "OAuth Access Token（仅 OAuth 模式）",
            type: "input",
            value: "",
            belongTo: { paramName: "authMode", value: ["oauth"] }
        }
    ],

    modules: [
        {
            title: "🔑 OAuth 授权",
            functionName: "oauthLogin",
            type: "action",
            description: "点击开始自动授权（浏览器打开 → 输入验证码 → 自动保存）"
        },
        {
            title: "我的片单",
            functionName: "loadTraktProfile",
            type: "list",
            cacheDuration: 300,
            params: [
                {
                    name: "section",
                    title: "浏览区域",
                    type: "enumeration",
                    value: "updates",
                    enumOptions: [
                        { title: "📅 追剧日历", value: "updates" },
                        { title: "📜 待看列表", value: "watchlist" },
                        { title: "📦 收藏列表", value: "collection" },
                        { title: "🕒 观看历史", value: "history" }
                    ]
                },
                {
                    name: "type",
                    title: "内容筛选",
                    type: "enumeration",
                    value: "all",
                    belongTo: { paramName: "section", value: ["watchlist", "collection", "history"] },
                    enumOptions: [ { title: "全部", value: "all" }, { title: "剧集", value: "shows" }, { title: "电影", value: "movies" } ]
                },
                {
                    name: "updateSort",
                    title: "追剧模式",
                    type: "enumeration",
                    value: "future_first",
                    belongTo: { paramName: "section", value: ["updates"] },
                    enumOptions: [
                        { title: "🔜 从今天往后", value: "future_first" },
                        { title: "🔄 按更新倒序", value: "air_date_desc" },
                        { title: "👁️ 按观看倒序", value: "watched_at" }
                    ]
                },
                { name: "page", title: "页码", type: "page" }
            ]
        }
    ]
};

// ==========================================
// 🎛️ Forward 手动开关配置区
// ==========================================
const FORWARD_OAUTH_CONFIG = {
    useOAuth: false,
    accessToken: "",
    refreshToken: "",
    clientSecret: "c1898d0393c991cb67317a38ada2f6a74efdb8dd67c389006652a14476b5a660" // 务必填写正确的 client secret
};

// ==========================================
// 0. 全局配置
// ==========================================
const TRAKT_CLIENT_ID = "4af702a58a691dccecdfe85fd4b3592048a8a71c5f168f395ae6a70dcd2bb94c";
const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";

// ==========================================
// 🔐 OAuth 自动授权功能（优化显示：使用 Forward 内置灰占位）
// ==========================================

async function oauthLogin(params = {}) {
    try {
        if (!FORWARD_OAUTH_CONFIG.clientSecret) {
            return [{
                id: "error",
                tmdbId: "error",
                type: "tmdb",
                mediaType: "tv",
                title: "❌ 配置错误",
                genreTitle: "缺少 Client Secret",
                subTitle: "缺少 Client Secret",
                posterPath: "",  // 让 Forward 显示内置灰色占位
                description: "请在代码中填写正确的 clientSecret（FORWARD_OAUTH_CONFIG.clientSecret）"
            }];
        }

        // 生成设备码
        const deviceCodeResponse = await Widget.http.post(
            "https://api.trakt.tv/oauth/device/code",
            { client_id: TRAKT_CLIENT_ID },
            { headers: { "Content-Type": "application/json" } }
        );

        const { user_code, device_code, verification_url, expires_in, interval = 5 } = deviceCodeResponse.data;

        // 尝试自动打开浏览器（如果 Forward 支持）
        try {
            if (typeof Widget.openUrl === "function") {
                Widget.openUrl(verification_url);
            }
        } catch (e) {
            console.log("无法自动打开浏览器，请手动访问");
        }

        // 返回模拟 TMDB 风格的授权提示项（posterPath 为空 → Forward 内置灰图）
        const instructionItem = {
            id: "auth_info",
            tmdbId: "auth_info",
            type: "tmdb",
            mediaType: "tv",
            title: "🔑 OAuth 授权中",
            genreTitle: `验证码：${user_code}`,
            subTitle: `验证码：${user_code}`,
            posterPath: "",  // ← 关键：空字符串，让 Forward 显示你之前喜欢的灰色占位图
            description: `请完成授权：\n\n` +
                         `1. 访问：${verification_url}\n` +
                         `2. 输入验证码：${user_code}\n\n` +
                         `验证码有效期约 5 分钟\n` +
                         `授权成功后 Token 会自动保存到配置中。\n` +
                         `(若浏览器未自动打开，请手动复制链接打开)`
        };

        // 异步开始轮询
        pollForToken(device_code, interval, expires_in, user_code);

        return [instructionItem];

    } catch (error) {
        return [{
            id: "error",
            tmdbId: "error",
            type: "tmdb",
            mediaType: "tv",
            title: "❌ 启动授权失败",
            genreTitle: "错误",
            subTitle: "错误",
            posterPath: "",
            description: `发生错误：${error.message || "未知错误"}\n请检查网络或 Client ID 是否正确`
        }];
    }
}

/**
 * 轮询检查授权状态
 */
async function pollForToken(deviceCode, interval, expiresIn, userCode) {
    const maxAttempts = Math.floor(expiresIn / interval);
    let attempts = 0;

    while (attempts < maxAttempts) {
        await sleep(interval * 1000);
        attempts++;

        try {
            const tokenResponse = await Widget.http.post(
                "https://api.trakt.tv/oauth/device/token",
                {
                    code: deviceCode,
                    client_id: TRAKT_CLIENT_ID,
                    client_secret: FORWARD_OAUTH_CONFIG.clientSecret
                },
                { headers: { "Content-Type": "application/json" } }
            );

            const tokens = tokenResponse.data;
            FORWARD_OAUTH_CONFIG.useOAuth = true;
            FORWARD_OAUTH_CONFIG.accessToken = tokens.access_token;
            FORWARD_OAUTH_CONFIG.refreshToken = tokens.refresh_token;

            console.log("✅ 授权成功！Access Token:", tokens.access_token);

            if (typeof Widget.showToast === "function") {
                Widget.showToast("✅ Trakt 授权成功！");
            }

            return tokens;

        } catch (error) {
            if (error.response?.status === 400 && error.response.data?.error === "authorization_pending") {
                continue;
            }
            console.error("轮询错误:", error);
            break;
        }
    }
    console.warn("授权轮询超时或失败");
    return null;
}

// ==========================================
// 自动刷新 Token
// ==========================================

async function autoRefreshTokenIfNeeded() {
    if (!FORWARD_OAUTH_CONFIG.useOAuth) return true;
    
    if (!FORWARD_OAUTH_CONFIG.accessToken && FORWARD_OAUTH_CONFIG.refreshToken) {
        console.log("🔄 尝试刷新 Access Token...");
        const newToken = await refreshAccessToken(FORWARD_OAUTH_CONFIG.refreshToken);
        if (newToken) {
            FORWARD_OAUTH_CONFIG.accessToken = newToken;
            console.log("✅ Token 刷新成功");
            return true;
        } else {
            console.error("❌ Token 刷新失败，请重新授权");
            return false;
        }
    }
    return true;
}

async function refreshAccessToken(refreshToken) {
    if (!FORWARD_OAUTH_CONFIG.clientSecret) {
        console.error("❌ 缺少 clientSecret，无法刷新");
        return null;
    }

    try {
        const response = await Widget.http.post(
            "https://api.trakt.tv/oauth/token",
            {
                refresh_token: refreshToken,
                client_id: TRAKT_CLIENT_ID,
                client_secret: FORWARD_OAUTH_CONFIG.clientSecret,
                grant_type: "refresh_token"
            },
            { headers: { "Content-Type": "application/json" } }
        );

        const tokens = response.data;
        FORWARD_OAUTH_CONFIG.accessToken = tokens.access_token;
        FORWARD_OAUTH_CONFIG.refreshToken = tokens.refresh_token;

        console.log("✅ Token 已刷新");
        return tokens.access_token;
    } catch (error) {
        console.error("刷新失败:", error);
        return null;
    }
}

// ==========================================
// 🔧 工具函数
// ==========================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function buildTraktHeaders(params) {
    const headers = {
        "Content-Type": "application/json",
        "trakt-api-version": "2"
    };

    if (FORWARD_OAUTH_CONFIG.useOAuth && FORWARD_OAUTH_CONFIG.accessToken) {
        headers["Authorization"] = `Bearer ${FORWARD_OAUTH_CONFIG.accessToken}`;
        console.log("使用 OAuth 模式");
    } else {
        headers["trakt-api-key"] = TRAKT_CLIENT_ID;
        console.log("使用只读模式");
    }

    return headers;
}

function formatShortDate(dateStr) {
    if (!dateStr) return "待定";
    const date = new Date(dateStr);
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${m}-${d}`;
}

// ==========================================
// 📋 主逻辑
// ==========================================

async function loadTraktProfile(params = {}) {
    const { traktUser, section, updateSort = "future_first", type = "all", page = 1 } = params;

    if (!traktUser) return [{ id: "err", type: "text", title: "请填写 Trakt 用户名" }];

    // 自动刷新 token（如果需要）
    await autoRefreshTokenIfNeeded();

    // === A. 追剧日历 (Updates) ===
    if (section === "updates") {
        return await loadUpdatesLogic(traktUser, params, updateSort, page);
    }

    // === B. 常规列表 ===
    let rawItems = [];
    const sortType = "added,desc";
    
    if (type === "all") {
        const [movies, shows] = await Promise.all([
            fetchTraktList(section, "movies", sortType, page, traktUser, params),
            fetchTraktList(section, "shows", sortType, page, traktUser, params)
        ]);
        rawItems = [...movies, ...shows];
    } else {
        rawItems = await fetchTraktList(section, type, sortType, page, traktUser, params);
    }
    
    rawItems.sort((a, b) => new Date(getItemTime(b, section)) - new Date(getItemTime(a, section)));
    
    if (!rawItems || rawItems.length === 0) return page === 1 ? [{ id: "empty", type: "text", title: "列表为空" }] : [];

    const promises = rawItems.map(async (item) => {
        const subject = item.show || item.movie || item;
        if (!subject?.ids?.tmdb) return null;
        let subInfo = "";
        const timeStr = getItemTime(item, section);
        if (timeStr) subInfo = timeStr.split('T')[0];
        if (type === "all") subInfo = `[${item.show ? "剧" : "影"}] ${subInfo}`;
        return await fetchTmdbDetail(subject.ids.tmdb, item.show ? "tv" : "movie", subInfo, subject.title);
    });
    return (await Promise.all(promises)).filter(Boolean);
}

// ==========================================
// 📅 追剧日历逻辑
// ==========================================

async function loadUpdatesLogic(user, params, sort, page) {
    const url = `https://api.trakt.tv/users/${user}/watched/shows?extended=noseasons&limit=100`;
    try {
        const res = await Widget.http.get(url, {
            headers: buildTraktHeaders(params)
        });
        const data = res.data || [];
        if (data.length === 0) return [{ id: "empty", type: "text", title: "无观看记录" }];

        const enrichedShows = await Promise.all(data.slice(0, 60).map(async (item) => {
            if (!item.show?.ids?.tmdb) return null;
            const tmdb = await fetchTmdbShowDetails(item.show.ids.tmdb);
            if (!tmdb) return null;
            
            const nextAir = tmdb.next_episode_to_air?.air_date;
            const lastAir = tmdb.last_episode_to_air?.air_date;
            const sortDate = nextAir || lastAir || "1970-01-01";
            const today = new Date().toISOString().split('T')[0];
            const isFuture = sortDate >= today;

            return {
                trakt: item, tmdb: tmdb,
                sortDate: sortDate,
                isFuture: isFuture,
                watchedDate: item.last_watched_at
            };
        }));

        const valid = enrichedShows.filter(Boolean);
        
        if (sort === "future_first") {
            const futureShows = valid.filter(s => s.isFuture && s.tmdb.next_episode_to_air);
            const pastShows = valid.filter(s => !s.isFuture || !s.tmdb.next_episode_to_air);
            futureShows.sort((a, b) => new Date(a.sortDate) - new Date(b.sortDate));
            pastShows.sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));
            valid.length = 0; 
            valid.push(...futureShows, ...pastShows);
        } else if (sort === "air_date_desc") {
            valid.sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));
        } else {
            valid.sort((a, b) => new Date(b.watchedDate) - new Date(a.watchedDate));
        }

        const start = (page - 1) * 15;
        return valid.slice(start, start + 15).map(item => {
            const d = item.tmdb;
            
            let displayStr = "暂无排期";
            let icon = "📅";
            let epData = null;

            if (d.next_episode_to_air) {
                icon = "🔜";
                epData = d.next_episode_to_air;
            } else if (d.last_episode_to_air) {
                icon = "📅";
                epData = d.last_episode_to_air;
            }

            if (epData) {
                const shortDate = formatShortDate(epData.air_date);
                displayStr = `${icon} ${shortDate} 📺 S${epData.season_number}E${epData.episode_number}`;
            }
            
            return {
                id: String(d.id), 
                tmdbId: d.id, 
                type: "tmdb", 
                mediaType: "tv",
                title: d.name, 
                genreTitle: displayStr, 
                subTitle: displayStr,
                posterPath: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : "",
                description: `上次观看: ${item.watchedDate.split("T")[0]}\n${d.overview}`
            };
        });
    } catch (e) { 
        console.error("加载追剧日历失败:", e);
        return []; 
    }
}

async function fetchTraktList(section, type, sort, page, user, params) {
    const limit = 20; 
    const url = `https://api.trakt.tv/users/${user}/${section}/${type}?extended=full&page=${page}&limit=${limit}`;
    try {
        const res = await Widget.http.get(url, {
            headers: buildTraktHeaders(params)
        });
        return Array.isArray(res.data) ? res.data : [];
    } catch (e) { 
        console.error("获取列表失败:", e);
        return []; 
    }
}

async function fetchTmdbDetail(id, type, subInfo, originalTitle) {
    try {
        const d = await Widget.tmdb.get(`/${type}/${id}`, { params: { language: "zh-CN" } });
        const year = (d.first_air_date || d.release_date || "").substring(0, 4);
        return {
            id: String(d.id), tmdbId: d.id, type: "tmdb", mediaType: type,
            title: d.name || d.title || originalTitle,
            genreTitle: year, subTitle: subInfo, description: d.overview,
            posterPath: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : ""
        };
    } catch (e) { return null; }
}

async function fetchTmdbShowDetails(id) {
    try { return await Widget.tmdb.get(`/tv/${id}`, { params: { language: "zh-CN" } }); } catch (e) { return null; }
}

function getItemTime(item, section) {
    if (section === "watchlist") return item.listed_at;
    if (section === "history") return item.watched_at;
    if (section === "collection") return item.collected_at;
    return item.created_at || "1970-01-01";
}
