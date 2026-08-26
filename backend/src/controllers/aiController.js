const fetch = globalThis.fetch || require('node-fetch');
require('dotenv').config();

exports.chatWithMetaAi = async (req, res) => {
  try {
    // Reload env vars in case user updated .env while server was running
    require('dotenv').config();

    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GROQ_API_KEY;

    // Fallback if GROQ_API_KEY is not configured yet
    if (!apiKey || apiKey === 'your_groq_api_key_here' || apiKey.trim() === '') {
      return res.json({
        reply: "Hello! I am Meta AI ✨. To activate live AI answers powered by Groq, please add your `GROQ_API_KEY` to the `backend/.env` file!"
      });
    }

    // List of active models with fallback strategy
    const candidateModels = ['groq/compound-mini', 'groq/compound', 'qwen/qwen3.6-27b'];
    let lastError = null;
    let replyText = null;

    for (const modelName of candidateModels) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              {
                role: 'system',
                content: 'You are Meta AI, an intelligent, friendly, and helpful AI assistant inside WhatsApp Web. Always structure your answers cleanly with clear line breaks, bullet/numbered lists (1., 2., 3.), and bold category titles (**Title**) for optimal readability.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1024
          })
        });

        if (response.ok) {
          const data = await response.json();
          let content = data?.choices?.[0]?.message?.content || '';
          // Strip internal thinking blocks if present (e.g. <think>...</think>)
          content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          if (content) {
            replyText = content;
            break;
          }
        } else {
          const errText = await response.text();
          console.error(`Groq API Error (${modelName}):`, errText);
          lastError = errText;
        }
      } catch (e) {
        console.error(`Groq fetch error (${modelName}):`, e);
        lastError = e.message;
      }
    }

    if (replyText) {
      return res.json({ reply: replyText });
    }

    return res.json({
      reply: `Meta AI couldn't connect to Groq API (${lastError || 'Invalid API key or response'}). Please verify your GROQ_API_KEY in Render dashboard environment settings!`
    });
  } catch (err) {
    console.error('Meta AI Controller Error:', err);
    return res.status(500).json({
      reply: "An error occurred while connecting to Meta AI. Please check your backend connection."
    });
  }
};
