

async function test() {
  try {
    const res = await fetch('http://localhost:8888/.netlify/functions/stylist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'detect_garment',
        image_base64: 'dummy'
      })
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
test();
