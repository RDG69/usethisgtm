const { TwitterApi } = require('twitter-api-v2');
const nodemailer = require('nodemailer');
require('dotenv').config();

// X API client
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

// Email transporter (SendGrid)
const transporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
});

// Score intent signals
function scoreSignal(tweet) {
  const b2bKeywords = ['B2B', 'SaaS', 'martech', 'fintech', 'analytics'];
  const highIntent = ['need GTM', 'sales stuck', 'pipeline weak', 'hire CRO', 'funding sales help'];
  let intent = 'Medium';
  if (highIntent.some(k => tweet.text.toLowerCase().includes(k))) intent = 'Very High';
  else if (b2bKeywords.some(k => tweet.text.toLowerCase().includes(k))) intent = 'High';
  return { intent, hook: highIntent.some(k => tweet.text.includes(k)) ? 'Embed GTM engine' : 'Boost B2B sales' };
}

// Generate HTML email with SBG branding
function generateEmail(signals, tweets) {
  const logoUrl = 'https://silverbirchgrowth.com/logo.png'; // Update with actual URL
  return `
    <html>
    <body style="font-family: Arial, sans-serif; font-size: 14px; color: #333; background-color: #ffffff;">
      <div style="margin-bottom: 20px; text-align: center;">
        <img src="${logoUrl}" alt="SBG Logo" style="height: 50px;">
        <br><br>
        <b style="font-size: 18px; color: #28A745;">🚀 SBG Intent Signal Report</b><br><br>
        <i style="color: #28A745;">Why did the SaaS founder hire SBG? To make revenue scale faster than a viral tweet!</i><br><br>
        <p>Today’s signals for early-stage B2B tech founders needing sales and GTM support:</p>
      </div>
      <div style="margin-bottom: 20px;">
        <b style="font-size: 16px; color: #28A745;">📊 B2B Tech Intent Signals</b><br><br>
        <p>High-value prospects showing GTM or sales intent:</p>
      </div>
      <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 2px solid #28A745; font-size: 13px; background-color: #f9fff9;">
        <tr style="background-color: #d4edda;">
          <th style="width: 20%; color: #155724;">Company/Founder</th>
          <th style="width: 15%; color: #155724;">Location</th>
          <th style="width: 15%; color: #155724;">Industry</th>
          <th style="width: 30%; color: #155724;">Signal</th>
          <th style="width: 10%; color: #155724;">Intent</th>
          <th style="width: 10%; color: #155724;">Hook</th>
        </tr>
        ${signals.map(s => `
          <tr style="background-color: #ffffff;">
            <td>${s.company}</td>
            <td>${s.location}</td>
            <td>${s.industry}</td>
            <td>${s.signal}</td>
            <td>${s.intent}</td>
            <td>${s.hook}</td>
          </tr>
        `).join('')}
      </table>
      <br>
      <div style="margin-bottom: 20px;">
        <b style="font-size: 16px; color: #28A745;">🗣️ Actionable Tweet Signals</b><br><br>
        <p>Top 10+ tweets from founders with urgent sales/GTM needs:</p>
      </div>
      <div style="background-color: #e9f7ef; padding: 15px; border-left: 4px solid #28A745;">
        ${tweets.map(t => `
          <p style="margin: 5px 0; color: #155724;"><strong>${t.text}</strong> <span style="color: #666;">(${t.intent})</span> - <em>Hook: ${t.hook}</em></p>
        `).join('')}
      </div>
    </body>
    </html>
  `;
}

// Main API endpoint
module.exports = async (req, res) => {
  try {
    // Fetch 100+ tweets
    const tweets = await client.v2.search('B2B (sales help OR GTM OR pipeline OR revenue) (SaaS OR martech OR fintech OR analytics) from:founder OR from:CEO -B2C -gaming -filter:retweets')
      .maxResults(150)
      .execute();

    const signals = [];
    const actionableTweets = [];
    for (const tweet of tweets.data) {
      const user = await client.v2.user(tweet.author_id);
      const { intent, hook } = scoreSignal(tweet);
      if (intent !== 'Medium') {
        const company = user.name.includes('founder') || user.name.includes('CEO') ? user.name : `Startup (${user.name})`;
        const location = user.location || 'Unknown';
        const industry = tweet.text.includes('SaaS') ? 'SaaS' : tweet.text.includes('martech') ? 'Martech' : tweet.text.includes('fintech') ? 'Fintech' : 'Tech';
        signals.push({
          company,
          location,
          industry,
          signal: `X post: ${tweet.text.slice(0, 50)}...`,
          intent,
          hook,
        });
        actionableTweets.push({
          text: tweet.text,
          intent,
          hook,
 
