import 'dotenv/config';

async function test() {
  const API_KEY = process.env.GEMINI_API_KEY;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
  const data = await res.json();
  const models = data.models.filter(m => m.supportedGenerationMethods?.includes('generateContent'));
  console.log(models.map(m => m.name));
}
test();
