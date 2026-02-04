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
            description: "点击获取验证码 -> 浏览器输入 -> 自动完成授权"
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
// 修复版授权逻辑
// ==========================================

async function oauthLogin(params = {}) {
    try {
        // Step 1: 获取设备码
        const res = await Widget.http.post("https://api.trakt.tv/oauth/device/code", {
            client_id: TRAKT_CLIENT_ID
        });

        const { user_code, device_code, verification_url, expires_in, interval = 5 } = res.data;

        // Step 2: 尝试跳转（失败不崩溃）
        try {
            if (typeof Widget.openUrl === "function") {
                Widget.openUrl(verification_url);
            }
        } catch (e) { console.log("Skip auto-open"); }

        // Step 3: 开启轮询
        pollForToken(device_code, interval, expires_in, user_code);

        // Step 4: 返回 UI 引导
        return [{
            id: "auth_guide",
            type: "text",
            title: "🔑 请在浏览器完成授权",
            description: `请访问: ${verification_url}\n输入验证码: ${user_code}\n\n等待中... 授权成功后会有控制台提示。`
        }];

    } catch (error) {
        return [{ id: "err", type: "text", title: "❌ 启动失败", description: error.message }];
    }
}

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
                FORWARD_OAUTH_CONFIG.useOAuth = true;
                console.log("✅ 授权成功！Token: " + res.data.access_token);
                return;
            }
        } catch (e) {
            if (e.response?.status !== 400) break;
        }
    }
}

// ==========================================
// 核心加载逻辑 (适配版)
// ==========================================

async function loadTraktProfile(params = {}) {
    const { traktUser, section, page = 1 } = params;
    if (!traktUser) return [{ id: "err", type: "text", title: "请填写用户名" }];

    const headers = {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": TRAKT_CLIENT_ID
    };

    if (FORWARD_OAUTH_CONFIG.useOAuth && FORWARD_OAUTH_CONFIG.accessToken) {
        headers["Authorization"] = `Bearer ${FORWARD_OAUTH_CONFIG.accessToken}`;
    }

    try {
        const url = `https://api.trakt.tv/users/${traktUser}/${section}/shows?extended=full&page=${page}&limit=15`;
        const res = await Widget.http.get(url, { headers });
        const items = res.data || [];

        if (items.length === 0) return [{ id: "empty", type: "text", title: "列表为空" }];

        const promises = items.map(async (item) => {
            const s = item.show || item;
            if (!s.ids?.tmdb) return null;
            try {
                const d = await Widget.tmdb.get(`/tv/${s.ids.tmdb}`, { params: { language: "zh-CN" } });
                return {
                    id: String(d.id),
                    type: "tmdb",
                    mediaType: "tv",
                    title: d.name || s.title,
                    genreTitle: (d.first_air_date || "").substring(0, 4),
                    posterPath: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : "",
                    description: d.overview
                };
            } catch (e) { return null; }
        });

        return (await Promise.all(promises)).filter(Boolean);
    } catch (e) {
        return [{ id: "err", type: "text", title: "加载失败", description: e.message }];
    }
}
