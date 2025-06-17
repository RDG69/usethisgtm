import { Configuration, OpenAIApi } from "openai";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

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

// Helper function to clean and extract JSON from GPT output
function extractJSON(rawText) {
  const jsonStart = rawText.indexOf("[");
  const jsonEnd = rawText.lastIndexOf("]");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("GPT response did not contain valid JSON array.");
  }
  const jsonString = rawText.substring(jsonStart, jsonEnd + 1);
  return JSON.parse(jsonString);
}

// Generate GPT intent signals
async function generateGPTSignals() {
  const prompt = `
You are generating simulated intent signals for Silver Birch Growth Inc. 

Generate 10 highly plausible, detailed signals of B2B SaaS, fintech, AI, or martech companies who are showing signals they need GTM or revenue help.

Respond ONLY in raw JSON array following this structure:
[
  {
    "company": "Company Name",
    "location": "City, Country",
    "industry": "Industry Label",
    "signal": "Very short description why intent is high",
    "intent": "Very High" or "High",
    "hook": "Short sales hook"
  }
]
`;

  const response = await openai.createChatCompletion({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  const raw = response.data.choices[0].message.content;
  return extractJSON(raw);
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
    <p>Today's GTM & revenue intent signals for SaaS, fintech, martech & AI:</p>
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
      ✅ Fully AI-generated for internal SBG pipeline use.
    </p>
  </body>
  </html>
  `;
}

// Main API endpoint
export default async function handler(req, res) {
  try {
    console.log("Starting GPT enrichment...");

    let signals = [];
    try {
      signals = await generateGPTSignals();
      console.log(`Generated ${signals.length} intent signals`);
    } catch (err) {
      console.error("GPT output failed:", err);
      signals = [];
    }

    if (signals.length === 0) {
      signals = [
        {
          company: "Fallback AI Inc",
          location: "San Francisco, USA",
          industry: "AI SaaS",
          signal: "Recently lost sales VP, struggling pipeline",
          intent: "Very High",
          hook: "Embed fractional GTM engine"
        }
      ];
    }

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
}
