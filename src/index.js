import 'dotenv/config';
import * as cheerio from 'cheerio';
import functions from '@google-cloud/functions-framework';
import { GoogleGenAI } from '@google/genai';
import { WebClient } from '@slack/web-api';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';

const FORECAST_URL =
  'https://forecast.weather.gov/MapClick.php?lat=42.4381&lon=-71.2387&unit=0&lg=english&FcstType=text&TextType=1';

const DISCUSSION_URL =
  'https://forecast.weather.gov/product.php?site=BOX&issuedby=BOX&product=AFD&format=CI&version=1&glossary=1&highlight=off';

const PROMPT_TEMPLATE = `You're a friendly local meteorologist. Don't describe yourself that way. Let it show instead. Use the voice of Dave Epstein (@growingwisdom). Here's the forecast for Lexington, MA:

<forecast>{{FORECAST_HTML}}</forecast>

And here's the NWS forecast discussion to go along with it:

<discussion>{{DISCUSSION_HTML}}</discussion>

Transform these into a shorter, more approachable form for the layman who just wants to know what the weather's going to be like - and a little of the why. Don't ask any questions at the end. Don't use section headings either.`;

functions.http('weatherbot', async (_req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  if (!GEMINI_API_KEY || !SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    console.error('missing environment variables');
    return res.status(500).send('config error');
  }

  const slack = new WebClient(SLACK_BOT_TOKEN);
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const headers = { 'User-Agent': USER_AGENT };

  try {
    const [forecastRes, discussionRes] = await Promise.all([
      fetch(FORECAST_URL, { headers }),
      fetch(DISCUSSION_URL, { headers }),
    ]);

    if (!forecastRes.ok) {
      throw new Error(`NWS forecast fetch failed: ${forecastRes.status}`);
    }
    if (!discussionRes.ok) {
      throw new Error(`NWS discussion fetch failed: ${discussionRes.status}`);
    }

    const forecastHtml = await forecastRes.text();
    const discussionHtml = await discussionRes.text();

    const $forecast = cheerio.load(forecastHtml);
    const $discussion = cheerio.load(discussionHtml);

    // contentArea -> div -> second table -> tbody -> tr -> td
    const forecastTd = $forecast('.contentArea div table')
      .eq(1)
      .find('tbody tr td')
      .first();
    const forecastContent =
      forecastTd.length > 0 ? (forecastTd.html() || '').trim() : '';

    const discussionPre = $discussion('#proddiff');
    const discussionContent =
      discussionPre.length > 0 ? (discussionPre.html() || '').trim() : '';

    const prompt = PROMPT_TEMPLATE.replace(
      '{{FORECAST_HTML}}',
      forecastContent,
    ).replace('{{DISCUSSION_HTML}}', discussionContent);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const text = response?.text ?? '';

    if (!text) {
      throw new Error('Gemini returned no text');
    }

    await slack.chat.postMessage({
      channel: SLACK_CHANNEL_ID,
      text,
    });

    res.status(200).send('ok');
  } catch (error) {
    console.error('error executing function:', error.message);

    await slack.chat.postMessage({
      channel: SLACK_CHANNEL_ID,
      text: `Error executing function: ${error.message}`,
    });

    res.status(500).send('internal server error');
  }
});
