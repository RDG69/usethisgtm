Test Webhook

SBG Intent Engine A Node.js app to scan X for B2B tech founders needing sales/GTM help, generate a beautiful HTML email with SBG branding, and deploy on Vercel.

Setup Create GitHub Repo:

Go to github.com, create a new repo (e.g., sbg-intent-engine). Add Files:

Copy-paste index.js, package.json, .env.example, and this README.md into the repo via GitHub’s web interface. Install Dependencies:

No local install needed; Vercel handles this. Configure Environment:

Copy .env.example to .env in the repo. Add your X API keys (from developer.x.com) and SendGrid API key (from sendgrid.com). Set EMAIL_TO to your email. Deploy to Vercel:

Sign up at vercel.com, link your GitHub repo. Import sbg-intent-engine, add env variables from .env in Vercel’s dashboard. Click “Deploy.” Vercel auto-runs daily at 8 AM EDT. Verify:

Check your inbox for the email (~5 minutes post-deploy). Adjust queries in index.js (e.g., add “B2B devtools”) if needed. Features Pulls 100+ X tweets for enriched intent data. Generates a green-branded HTML email with your SBG logo. Includes 10+ company signals in a table and 10+ actionable tweet signals below. Troubleshooting X API Error: Ensure keys are correct; check rate limits (10,000 reads/month on Basic tier). Email Not Sent: Verify SendGrid key and EMAIL_TO. No Signals: Broaden queries or increase maxResults in index.js. Support Contact info@silverbirchgrowth.com for help.
