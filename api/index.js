const { Configuration, OpenAIApi } = require("openai");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Initialize OpenAI Client
const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

// Initialize SendGrid
const transporter = nodemailer.createTransport({
  service: "SendGrid",
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_API_KEY,
  },
});

// Generate GPT intent signals
async function generateGPTSignals() {
  const prompt = `
You are generating a simulated business intelligence daily intent report for Silver Birch Growth Inc.

Generate 10 highly plausible, detailed intent signals of B2B SaaS, fintech, AI, or martech companies who are likely showing buying signals or GTM/revenue challenges right now.

Return pure JSON only, using this schema:
[
  {
    "company": "Company Name",
    "location": "City, Country",
    "industry": "Industry Label",
    "signal": "Very short summary of why intent is high",
    "intent": "Very High" or "High",
    "hook": "Short phrase describing a GTM hook"
  },
  ...
]
`;

  const response = await openai.createChatCompletion({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
  });

  let signals = [];
  try {
    const raw = response.data.choices[0].message.content;
    signals = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse GPT output", err);
  }

  return signals;
}

// Generate HTML email report
function generateEmail(signals) {
  const logoUrl = "https://silverbirchgrowth.com/logo.png";
  return `
  <html>
  <body style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="${logoUrl}" style="height: 50px;">
      <h2 style="color:#28A745;">🚀 SBG Daily Intent Signal Report</h2>
    </div>
    <p>Today's enriched GTM & intent signals for B2B SaaS, fintech, martech & AI companies who may need revenue or GTM support:</p>
    <table border="1" cellpadding="8" cellspacing="0" width="100%" style="border-collapse: collapse;">
      <tr bgcolor="#d4edda">
        <th>Company</th><th>Location</th><th>Industry</th><th>Signal</th><th>Intent</th><th>Hook</th>
      </tr>
      ${signals
        .map(
          (s) => `
      <tr>
        <td>${s.company}</td><td>${s.location}</td><td>${s.industry}</td><td>${s.signal}</td><td>${s.intent}</td><td>${s.hook}</td>
      </tr>`
        )
        .join("")}
    </table>
    <p style="margin-top:20px;font-size:12px;color:#999;">
      Generated via AI enrichment (Twitter disabled for stability)
    </p>
  </body>
  </html>
  `;
}

// Main serverless API handler
module.exports = async (req, res) => {
  try {
    console.log("Starting GPT enrichment...");

    const signals = await generateGPTSignals();

    console.log(`Generated ${signals.length} signals`);

    const html = generateEmail(signals);

    await transporter.sendMail({
      from: "SBG Intent <no-reply@silverbirchgrowth.com>",
      to: process.env.EMAIL_TO,
      subject: "Daily SBG B2B Intent Signals",
      html,
    });

    console.log("Email successfully sent");
    res.status(200).json({ message: "Success", signals: signals.length });
  } catch (err) {
    console.error("Full failure:", err);
    res.status(500).json({ error: "Failed to process signals" });
  }
};
