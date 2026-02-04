WidgetMetadata = {
    id: "trakt_sam_666",
    title: "Trakt 追剧日历",
    author: "Jackie",
    description: "追剧日历、待看、收藏及历史记录",
    version: "1.0.0", // 版本号微升
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
// 🔐 OAuth 自动授权功能
// ==========================================

/**
 * OAuth 自动授权入口
 * 用户点击「🔑 OAuth 授权」按钮后调用
 */
async function oauthLogin(params = {}) {
    try {
        // Step 1: 检查 Client Secret
        if (!FORWARD_OAUTH_CONFIG.clientSecret) {
            return [{
                id: "error",
                type: "text",
                title: "❌ 配置错误",
                description: "请先在代码中填写 FORWARD_OAUTH_CONFIG.clientSecret\n\n获取方式：\n1. 访问 https://trakt.tv/oauth/applications\n2. 创建应用并获取 Client Secret\n3. 填写到代码第 78 行"
            }];
        }

        // Step 2: 生成设备码
        Widget.showToast("正在生成授权码...", { duration: 2000 });
        
        const deviceCodeResponse = await Widget.http.post(
            "https://api.trakt.tv/oauth/device/code",
            {
                client_id: TRAKT_CLIENT_ID
            },
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const deviceData = deviceCodeResponse.data;
        const userCode = deviceData.user_code;
        const deviceCode = deviceData.device_code;
        const verificationUrl = deviceData.verification_url;
        const expiresIn = deviceData.expires_in;
        const interval = deviceData.interval || 5;

        // Step 3: 打开浏览器
        Widget.openUrl(verificationUrl);
        
        // Step 4: 显示验证码
        Widget.showToast(`验证码: ${userCode}\n\n已打开浏览器，请输入验证码\n等待授权中...`, {
            duration: 10000
        });

        // Step 5: 轮询检查授权
        const tokens = await pollForToken(deviceCode, interval, expiresIn, userCode);

        if (tokens) {
            // Step 6: 自动保存到 Forward 配置
            FORWARD_OAUTH_CONFIG.useOAuth = true;
            FORWARD_OAUTH_CONFIG.accessToken = tokens.access_token;
            FORWARD_OAUTH_CONFIG.refreshToken = tokens.refresh_token;

            Widget.showToast("✅ OAuth 授权成功！Token 已自动保存", { duration: 3000 });

            return [{
                id: "success",
                type: "text",
                title: "✅ 授权成功",
                description: `Access Token: ${tokens.access_token.substring(0, 20)}...\n\nRefresh Token: ${tokens.refresh_token.substring(0, 20)}...\n\n有效期: ${Math.floor(tokens.expires_in / 86400)} 天\n\n⚠️ 请复制上面的 Token 到代码中保存：\n\nFORWARD_OAUTH_CONFIG = {\n  useOAuth: true,\n  accessToken: "${tokens.access_token}",\n  refreshToken: "${tokens.refresh_token}",\n  clientSecret: "${FORWARD_OAUTH_CONFIG.clientSecret}"\n}`
            }];
        } else {
            throw new Error("授权超时或被拒绝");
        }

    } catch (error) {
        Widget.showToast(`❌ 授权失败: ${error.message}`, { duration: 5000 });
        return [{
            id: "error",
            type: "text",
            title: "❌ 授权失败",
            description: `错误信息: ${error.message}\n\n请检查：\n1. 网络连接是否正常\n2. Client Secret 是否正确\n3. 是否在浏览器中完成授权`
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

        // 显示进度
        if (attempts % 3 === 0) {
            Widget.showToast(`等待授权中... (${attempts}/${maxAttempts})\n验证码: ${userCode}`, {
                duration: 3000
            });
        }

        try {
            const tokenResponse = await Widget.http.post(
                "https://api.trakt.tv/oauth/device/token",
                {
                    code: deviceCode,
                    client_id: TRAKT_CLIENT_ID,
                    client_secret: FORWARD_OAUTH_CONFIG.clientSecret
                },
                {
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

            // 成功获取 token
            return tokenResponse.data;

        } catch (error) {
            if (error.response?.status === 400) {
                const errorData = error.response.data;
                if (errorData.error === "authorization_pending") {
                    // 继续等待
                    continue;
                } else if (errorData.error === "expired_token") {
                    throw new Error("授权码已过期，请重新授权");
                } else if (errorData.error === "access_denied") {
                    throw new Error("用户拒绝了授权");
                }
            }
            // 其他错误继续重试
            continue;
        }
    }

    return null; // 超时
}
/**
 * 自动刷新 Access Token
 */
async function autoRefreshTokenIfNeeded() {
    if (!FORWARD_OAUTH_CONFIG.useOAuth) return true;
    
    // 如果 Access Token 为空但有 Refresh Token，尝试刷新
    if (!FORWARD_OAUTH_CONFIG.accessToken && FORWARD_OAUTH_CONFIG.refreshToken) {
        console.log("🔄 Access Token 为空，尝试刷新...");
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
        console.error("❌ 缺少 Client Secret，无法刷新 token");
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
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const tokens = response.data;
        
        // 更新配置
        FORWARD_OAUTH_CONFIG.accessToken = tokens.access_token;
        FORWARD_OAUTH_CONFIG.refreshToken = tokens.refresh_token;

        console.log("✅ Token 已刷新，新 Token:", tokens.access_token.substring(0, 20) + "...");

        return tokens.access_token;
    } catch (error) {
        console.error("刷新 token 失败:", error);
        return null;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// ==========================================
// 0. 全局配置 & 工具函数
// ==========================================
function buildTraktHeaders(params) {
    const headers = {
        "Content-Type": "application/json",
        "trakt-api-version": "2"
    };

    if (params.authMode === "oauth" && params.accessToken) {
        headers["Authorization"] = `Bearer ${params.accessToken}`;
    } else {
        headers["trakt-api-key"] = TRAKT_CLIENT_ID;
    }

    return headers;
}

// 修改点：内置 Client ID
const TRAKT_CLIENT_ID = "8e3ef2a3a889724abe329a12b5c6e9a4d38f3a43f8861773a14bcccfebc0005d";

function formatShortDate(dateStr) {
    if (!dateStr) return "待定";
    const date = new Date(dateStr);
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${m}-${d}`;
}

// ==========================================
// 1. 主逻辑
// ==========================================

async function loadTraktProfile(params = {}) {
    // 修改点：不再从 params 读取 id，直接使用常量
    const { traktUser, section, updateSort = "future_first", type = "all", page = 1 } = params;

    if (!traktUser) return [{ id: "err", type: "text", title: "请填写 Trakt 用户名" }];

    // === A. 追剧日历 (Updates) ===
    if (section === "updates") {
        return await loadUpdatesLogic(traktUser, params, updateSort, page);
    }

    // === B. 常规列表 ===
    let rawItems = [];
    const sortType = "added,desc";
    
    // 使用内置 ID 调用
    if (type === "all") {
        const [movies, shows] = await Promise.all([
            fetchTraktList(section, "movies", sortType, page, traktUser, params),
            fetchTraktList(section, "shows", sortType, page, traktUser, params)
        ]);
        rawItems = [...movies, ...shows];
    } else {
        rawItems = await fetchTraktList(section, type, sortType, page, traktUser, TRAKT_CLIENT_ID);
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
// 2. 追剧日历逻辑 (保持 UI 不变)
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

            if (sort === "watched_at") {
                // const watchShort = formatShortDate(item.watchedDate.split('T')[0]);
                // displayStr = `👁️ ${watchShort} 看过`;
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
    } catch (e) { return []; }
}

async function fetchTraktList(section, type, sort, page, user, params) {
    const limit = 20; 
    const url = `https://api.trakt.tv/users/${user}/${section}/${type}?extended=full&page=${page}&limit=${limit}`;
    try {
        const res = await Widget.http.get(url, {
            headers: buildTraktHeaders(params)
        });
        return Array.isArray(res.data) ? res.data : [];
    } catch (e) { return []; }
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
