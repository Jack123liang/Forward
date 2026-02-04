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
            description: "获取验证码并在浏览器完成授权"
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

const FORWARD_OAUTH_CONFIG = {
    useOAuth: false,
    accessToken: "",
    refreshToken: "",
    clientSecret: "c1898d0393c991cb67317a38ada2f6a74efdb8dd67c389006652a14476b5a660"
};

const TRAKT_CLIENT_ID = "4af702a58a691dccecdfe85fd4b3592048a8a71c5f168f395ae6a70dcd2bb94c";

// ==========================================
// 修复：兼容性授权逻辑
// ==========================================

async function oauthLogin(params = {}) {
    try {
        const res = await Widget.http.post("https://api.trakt.tv/oauth/device/code", { client_id: TRAKT_CLIENT_ID });
        const { user_code, device_code, verification_url, expires_in, interval = 5 } = res.data;

        // 核心修复点：不再因为 openUrl 缺失而崩溃
        try {
            if (typeof Widget.openUrl === "function") {
                Widget.openUrl(verification_url);
            }
        } catch (e) { console.log("Environment does not support openUrl"); }

        // 启动轮询
        pollForToken(device_code, interval, expires_in, user_code);

        return [{
            id: "auth_info",
            type: "text",
            title: "🔑 请手动完成授权",
            description: `1. 访问: ${verification_url}\n2. 输入验证码: ${user_code}\n\n完成后请返回刷新片单。`
        }];
    } catch (error) {
        return [{ id: "err", type: "text", title: "❌ 启动失败", description: error.message }];
    }
}

// 轮询逻辑 (保持原版功能)
async function pollForToken(deviceCode, interval, expiresIn, userCode) {
    const max = Math.floor(expiresIn / interval);
    for (let i = 0; i < max; i++) {
        await new Promise(r => setTimeout(r, interval * 1000));
        try {
            const res = await Widget.http.post("https://api.trakt.tv/oauth/device/token", {
                code: deviceCode,
                client_id: TRAKT_CLIENT_ID,
                client_secret: FORWARD_OAUTH_CONFIG.clientSecret
            });
            if (res.data.access_token) {
                FORWARD_OAUTH_CONFIG.accessToken = res.data.access_token;
                FORWARD_OAUTH_CONFIG.refreshToken = res.data.refresh_token;
                FORWARD_OAUTH_CONFIG.useOAuth = true;
                console.log("✅ 授权成功");
                return;
            }
        } catch (e) { if (e.response?.status !== 400) break; }
    }
}

// ==========================================
// 完整业务逻辑 (还原原版所有功能)
// ==========================================

async function loadTraktProfile(params = {}) {
    const { traktUser, section, updateSort = "future_first", type = "all", page = 1 } = params;
    if (!traktUser) return [{ id: "err", type: "text", title: "请填写用户名" }];

    // 自动刷新逻辑
    if (FORWARD_OAUTH_CONFIG.useOAuth && !FORWARD_OAUTH_CONFIG.accessToken && FORWARD_OAUTH_CONFIG.refreshToken) {
        await refreshAccessToken(FORWARD_OAUTH_CONFIG.refreshToken);
    }

    if (section === "updates") {
        return await loadUpdatesLogic(traktUser, params, updateSort, page);
    }

    let rawItems = [];
    if (type === "all") {
        const [m, s] = await Promise.all([
            fetchTraktList(section, "movies", "added,desc", page, traktUser, params),
            fetchTraktList(section, "shows", "added,desc", page, traktUser, params)
        ]);
        rawItems = [...m, ...s];
    } else {
        rawItems = await fetchTraktList(section, type, "added,desc", page, traktUser, params);
    }

    rawItems.sort((a, b) => new Date(getItemTime(b, section)) - new Date(getItemTime(a, section)));
    
    const promises = rawItems.map(async (item) => {
        const subject = item.show || item.movie || item;
        if (!subject?.ids?.tmdb) return null;
        const subInfo = (getItemTime(item, section) || "").split('T')[0];
        return await fetchTmdbDetail(subject.ids.tmdb, item.show ? "tv" : "movie", subInfo, subject.title);
    });
    return (await Promise.all(promises)).filter(Boolean);
}

// 还原追剧日历的复杂排序逻辑
async function loadUpdatesLogic(user, params, sort, page) {
    const url = `https://api.trakt.tv/users/${user}/watched/shows?extended=noseasons&limit=100`;
    try {
        const res = await Widget.http.get(url, { headers: buildHeaders(params) });
        const data = res.data || [];
        const enriched = await Promise.all(data.slice(0, 50).map(async (item) => {
            const tmdb = await fetchTmdbShowDetails(item.show.ids.tmdb);
            if (!tmdb) return null;
            const sortDate = tmdb.next_episode_to_air?.air_date || tmdb.last_episode_to_air?.air_date || "1970-01-01";
            return { trakt: item, tmdb: tmdb, sortDate, isFuture: sortDate >= new Date().toISOString().split('T')[0] };
        }));

        const valid = enriched.filter(Boolean);
        if (sort === "future_first") {
            const f = valid.filter(s => s.isFuture).sort((a,b) => new Date(a.sortDate) - new Date(b.sortDate));
            const p = valid.filter(s => !s.isFuture).sort((a,b) => new Date(b.sortDate) - new Date(a.sortDate));
            valid.splice(0, valid.length, ...f, ...p);
        } else if (sort === "air_date_desc") {
            valid.sort((a,b) => new Date(b.sortDate) - new Date(a.sortDate));
        }

        return valid.slice((page-1)*15, page*15).map(item => {
            const d = item.tmdb;
            const ep = d.next_episode_to_air || d.last_episode_to_air;
            const info = ep ? `${d.next_episode_to_air?'🔜':'📅'} ${ep.air_date.slice(5)} S${ep.season_number}E${ep.episode_number}` : "暂无排期";
            return {
                id: String(d.id), type: "tmdb", mediaType: "tv",
                title: d.name, genreTitle: info, subTitle: info,
                posterPath: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : "",
                description: d.overview
            };
        });
    } catch (e) { return []; }
}

// 辅助函数们
function buildHeaders(params) {
    const h = { "Content-Type": "application/json", "trakt-api-version": "2" };
    if (FORWARD_OAUTH_CONFIG.useOAuth && FORWARD_OAUTH_CONFIG.accessToken) {
        h["Authorization"] = `Bearer ${FORWARD_OAUTH_CONFIG.accessToken}`;
    } else { h["trakt-api-key"] = TRAKT_CLIENT_ID; }
    return h;
}

async function fetchTraktList(s, t, sort, p, u, params) {
    try {
        const res = await Widget.http.get(`https://api.trakt.tv/users/${u}/${s}/${t}?extended=full&page=${p}&limit=20`, { headers: buildHeaders(params) });
        return res.data || [];
    } catch (e) { return []; }
}

async function fetchTmdbDetail(id, type, sub, title) {
    try {
        const d = await Widget.tmdb.get(`/${type}/${id}`, { params: { language: "zh-CN" } });
        return { id: String(d.id), type: "tmdb", mediaType: type, title: d.name || d.title || title,
                 genreTitle: (d.first_air_date || d.release_date || "").slice(0,4), subTitle: sub,
                 posterPath: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : "", description: d.overview };
    } catch (e) { return null; }
}

async function fetchTmdbShowDetails(id) {
    try { return await Widget.tmdb.get(`/tv/${id}`, { params: { language: "zh-CN" } }); } catch (e) { return null; }
}

function getItemTime(item, section) {
    return item.listed_at || item.watched_at || item.collected_at || item.created_at;
}
