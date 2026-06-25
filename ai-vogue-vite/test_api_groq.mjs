import 'dotenv/config';

async function test() {
  try {
    const API_KEY = process.env.GROQ_API_KEY;
    const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "user", content: "hello" }
        ]
      }),
    });

    if (!response.ok) {
      console.error(`Error: ${response.status} - ${await response.text()}`);
      return;
    }

    const data = await response.json();
    console.log(data.choices[0].message.content);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
