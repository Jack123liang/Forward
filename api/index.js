export default async function handler(req, res) {
  const { path = '/3/trending/all/day' } = req.query;
  const apiKey = '6358fd374e1372bd48effd9e21521917'; // 直接写死，排除万难
  const url = `https://api.themoviedb.org${path}${path.includes('?') ? '&' : '?'}api_key=${apiKey}&language=zh-CN`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*'); // 允许跨域，防止脚本报错
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Connect failed" });
  }
}
