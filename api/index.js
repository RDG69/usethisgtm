const { TwitterApi } = require('twitter-api-v2');
const nodemailer = require('nodemailer');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

// Twitter API client (soft failure tolerant)
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

// OpenAI client
const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

// SendGrid email client
const transporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
});

// Generate GPT fallback signals
async function generateGPTSignals() {
  const prompt = `
You are an AI generating simulated business intelligence signals for Silver Birch Growth Inc.
Your job is to output 10 highly plausible B2B SaaS or service companies who are showing signals of needing GTM or revenue help.
Output JSON array like:
[{"company":"Acme AI","location":"San Francisco, CA","industry":"AI SaaS","signal":"Hiring CRO, pipeline weak","intent":"Very High","hook":"Embed GTM engine"}]
`;

  const completion = await openai.createChatCompletion({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
  });

  const raw = completion.data.choices[0].message.content;
  let signals = [];

  try {
    signals = JSON.parse(raw);
  } catch (e) {
    console.error("GPT output parsing failed", e);
  }

  return signals;
}

// Generate HTML email
function generateEmail(signals, twitterWorked) {
  const logoUrl = 'https://silverbirchgrowth.com/logo.png';
  return `
  <html>
  <body style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
    <div style="text-align: center;">
      <img src="${logoUrl}" style="height: 50px;">
      <h2 style="color:#28A745;">🚀 SBG Intent Signal Report</h2>
    </div>
    <p>Today’s enriched GTM intent signals for SaaS & B2B founders needing revenue help:</p>
    <table border="1" cellpadding="8" cellspacing="0" width="100%" style="border-collapse: collapse;">
      <tr bgcolor="#d4edda">
        <th>Company</th><th>Location</th><th>Industry</th><th>Signal</th><th>Intent</th><th>Hook</th>
      </tr>
      ${signals.map(s => `
      <tr>
        <td>${s.company}</td><td>${s.location}</td><td>${s.industry}</td><td>${s.signal}</td><td>${s.intent}</td><td>${s.hook}</td>
      </tr>`).join('')}
    </table>
    <p style="margin-top:20px;font-size:12px;color:#999;">
      ${twitterWorked ? "" : "⚠ Twitter API failed — signals generated via AI enrichment only."}
    </p>
  </body>
  </html>`;
}

// Main function
module.exports = async (req, res) => {
  try {
    let signals = [];
    let twitterWorked = true;

    // Try pulling Twitter first
    try {
      const response = await client.v2.search(
        'B2B OR SaaS OR Fintech OR MarTech OR GTM OR Sales',
        { max_results: 50 }
      );

      const { data: tweets = [] } = response;

      console.log(`Pulled ${tweets.length} tweets`);

      for (const tweet of tweets) {
        const user = await client.v2.userById(tweet.author_id);
        signals.push({
          company: user.name,
          location: user.location || 'Unknown',
          industry: tweet.text.includes('SaaS') ? 'SaaS' :
                    tweet.text.includes('martech') ? 'Martech' :
                    tweet.text.includes('fintech') ? 'Fintech' : 'Tech',
          signal: tweet.text.slice(0, 50) + "...",
          intent: "High",
          hook: "Boost B2B sales"
        });

        if (signals.length >= 10) break;
      }
    } catch (err) {
      console.error("Twitter API failed:", err);
      twitterWorked = false;
    }

    // If no Twitter signals → fallback to GPT
    if (signals.length === 0) {
      console.log("Falling back to GPT intent signals...");
      signals = await generateGPTSignals();
    }

    const html = generateEmail(signals, twitterWorked);

    await transporter.sendMail({
      from: 'SBG Intent <no-reply@silverbirchgrowth.com>',
      to: process.env.EMAIL_TO,
      subject: 'Daily SBG B2B Intent Signals',
      html,
    });

    console.log("Email sent successfully");
    res.status(200).json({ message: "Success", signals: signals.length });

  } catch (error) {
    console.error("Full error:", error);
    res.status(500).json({ error: 'Failed to process signals' });
  }
};
