import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

async function test() {
  try {
    const API_KEY = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('hello');
    console.log(result.response.text());
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
