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
// 自动刷新 Token 等后续函数（保持不变）
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

// loadTraktProfile、loadUpdatesLogic 等主逻辑函数保持不变（省略以节省篇幅）
// 请从你原来的代码中保留以下部分：
// - loadTraktProfile
// - loadUpdatesLogic
// - fetchTraktList
// - fetchTmdbDetail
// - fetchTmdbShowDetails
// - getItemTime

// 如果你需要我把完整版（包含所有函数）再贴一次，请告诉我，我可以补全。
