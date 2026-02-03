export default async function handler(req, res) {
  const { path = '/3/trending/all/day' } = req.query;
  const apiKey = process.env.TMDB_API_KEY; // 自动读取你刚才设置的变量
  const url = `https://api.themoviedb.org${path}${path.includes('?') ? '&' : '?'}api_key=${apiKey}&language=zh-CN`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data from TMDB" });
  }
}
