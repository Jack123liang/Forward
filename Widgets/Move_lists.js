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
{
  title: "TMDB 电影基础测试",
  description: "基础测试接口，确认数据可读取",
  requiresWebView: false,
  functionName: "loadBasicMovies",
  cacheDuration: 3600,
  params: [
    { name: "language", title: "语言", type: "language", value: "zh-CN" },
    { 
      name: "sort_by", 
      title: "地区", 
      type: "enumeration", 
      enumOptions: [
        { title: "全部地区", value: "" },
        { title: "中国", value: "CN" },
        { title: "美国", value: "US" },
        { title: "韩国", value: "KR" },
        { title: "日本", value: "JP" }
      ], 
      value: "" 
    },
    { name: "page", title: "页码", type: "page", value: 1 }
  ]
}
