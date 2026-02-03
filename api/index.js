export default async function handler(req, res) {
  const { path = '/3/trending/all/day' } = req.query;
  // 直接写死 Key，不再依赖环境变量，排除所有干扰因素
  const apiKey = '6358fd374e1372bd48effd9e21521917'; 
  const url = `https://api.themoviedb.org${path}${path.includes('?') ? '&' : '?'}api_key=${apiKey}&language=zh-CN`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Connect to TMDB failed" });
  }
}

