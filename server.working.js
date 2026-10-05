import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;

/* =========================================================
   RUANI AI CONFIG
========================================================= */

const PRIMARY_MODEL =
  process.env.GEMINI_PRIMARY_MODEL || "gemini-3.8-flash";

const FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash";

const MAX_RETRIES_PRIMARY = 3;
const MAX_RETRIES_FALLBACK = 2;

const BASE_DELAY_MS = 1500;
const MAX_DELAY_MS = 12000;


/* =========================================================
   API KEY
========================================================= */

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing hai .env file me");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});


/* =========================================================
   BASIC HELPERS
========================================================= */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function getErrorStatus(error) {

  const text = String(
    error?.message ||
    error?.status ||
    error?.code ||
    ""
  ).toLowerCase();

  const status =
    Number(error?.status) ||
    Number(error?.code);

  if (
    [
      400,
      401,
      403,
      404,
      408,
      409,
      429,
      499,
      500,
      501,
      502,
      503,
      504
    ].includes(status)
  ) {
    return status;
  }

  if (
    text.includes("503") ||
    text.includes("unavailable") ||
    text.includes("service unavailable") ||
    text.includes("high demand") ||
    text.includes("overloaded")
  ) {
    return 503;
  }

  if (
    text.includes("429") ||
    text.includes("rate limit") ||
    text.includes("resource exhausted") ||
    text.includes("too many requests")
  ) {
    return 429;
  }

  if (
    text.includes("504") ||
    text.includes("deadline exceeded")
  ) {
    return 504;
  }

  if (text.includes("502")) {
    return 502;
  }

  if (
    text.includes("500") ||
    text.includes("internal")
  ) {
    return 500;
  }

  if (
    text.includes("timeout") ||
    text.includes("timed out") ||
    text.includes("network") ||
    text.includes("fetch failed") ||
    text.includes("socket")
  ) {
    return 503;
  }

  return null;
}


function isRetryableError(error) {

  const status = getErrorStatus(error);

  return [
    408,
    429,
    499,
    500,
    502,
    503,
    504
  ].includes(status);
}


function getRetryDelay(attempt) {

  const exponential = Math.min(
    BASE_DELAY_MS * Math.pow(2, attempt),
    MAX_DELAY_MS
  );

  const jitter =
    Math.floor(Math.random() * 500);

  return exponential + jitter;
}


function getFriendlyError(error) {

  const status = getErrorStatus(error);

  if (status === 429) {
    return "RUANI AI par abhi requests zyada hain. Thodi der me dobara try karein.";
  }

  if (status === 503) {
    return "RUANI AI service abhi temporarily busy hai. Please thodi der baad dobara try karein.";
  }

  if (status === 504) {
    return "RUANI AI response me zyada time lag gaya. Please dobara try karein.";
  }

  if (
    status === 401 ||
    status === 403
  ) {
    return "RUANI AI API configuration me problem hai. Backend configuration check karein.";
  }

  if (status === 400) {
    return "RUANI AI ko request samajhne me problem hui. Question thoda simple karke try karein.";
  }

  return "RUANI AI abhi answer nahi de pa raha. Please dobara try karein.";
}


/* =========================================================
   GEMINI REQUEST WITH RETRY
========================================================= */

async function generateWithRetry(
  model,
  contents,
  maxRetries
) {

  let lastError = null;

  for (
    let attempt = 0;
    attempt <= maxRetries;
    attempt++
  ) {

    try {

      console.log(
        `🤖 Gemini request | ${model} | Attempt ${attempt + 1}/${maxRetries + 1}`
      );

      const response =
        await ai.models.generateContent({

          model,

          contents,

          config: {
            temperature: 0.4,
            maxOutputTokens: 1400
          }

        });


      const answer = response?.text;


      if (
        !answer ||
        !answer.trim()
      ) {
        throw new Error(
          "Gemini ne empty response diya."
        );
      }


      console.log(
        `✅ Gemini response received | ${model}`
      );


      return {
        success: true,
        answer: answer.trim(),
        model
      };


    } catch (error) {

      lastError = error;

      const status =
        getErrorStatus(error);

      const retryable =
        isRetryableError(error);


      console.error(
        `❌ Gemini error | ${model} | Attempt ${attempt + 1}`,
        {
          status,
          message: error?.message
        }
      );


      if (!retryable) {
        break;
      }


      if (
        attempt >= maxRetries
      ) {
        break;
      }


      const delay =
        getRetryDelay(attempt);


      console.log(
        `⏳ Retrying in ${delay}ms...`
      );


      await sleep(delay);
    }
  }


  return {
    success: false,
    error: lastError
  };
}


/* =========================================================
   PRIMARY + FALLBACK MODEL
========================================================= */

async function generateRUANIAnswer(contents) {

  console.log(
    `\n🚀 Primary model: ${PRIMARY_MODEL}`
  );


  const primaryResult =
    await generateWithRetry(
      PRIMARY_MODEL,
      contents,
      MAX_RETRIES_PRIMARY
    );


  if (primaryResult.success) {
    return primaryResult;
  }


  console.log(
    `\n🔄 Primary failed. Trying fallback: ${FALLBACK_MODEL}`
  );


  if (
    FALLBACK_MODEL === PRIMARY_MODEL
  ) {
    return primaryResult;
  }


  const fallbackResult =
    await generateWithRetry(
      FALLBACK_MODEL,
      contents,
      MAX_RETRIES_FALLBACK
    );


  if (fallbackResult.success) {

    console.log(
      `✅ Fallback successful: ${FALLBACK_MODEL}`
    );

    return fallbackResult;
  }


  console.error(
    "❌ Primary + fallback dono fail."
  );


  return {
    success: false,
    error:
      fallbackResult.error ||
      primaryResult.error
  };
}


/* =========================================================
   HOME / HEALTH CHECK
========================================================= */

app.get("/", (req, res) => {

  res.json({

    success: true,

    message:
      "RUANI AI Backend is running 🚀",

    primaryModel:
      PRIMARY_MODEL,

    fallbackModel:
      FALLBACK_MODEL,

    retryEnabled: true,

    priorityActions: true

  });

});


/* =========================================================
   ASK RUANI
========================================================= */

app.post("/ask", async (req, res) => {

  try {

    const { question } =
      req.body;


    /* -----------------------------------------------------
       VALIDATE QUESTION
    ----------------------------------------------------- */

    if (
      typeof question !== "string" ||
      !question.trim()
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Question required hai."

      });

    }


    const cleanQuestion =
      question.trim();


    if (
      cleanQuestion.length > 15000
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Question/data bahut large hai."

      });

    }


    console.log(
      "\n================================="
    );

    console.log(
      "👤 RUANI USER QUESTION:"
    );

    console.log(
      cleanQuestion
    );

    console.log(
      "=================================\n"
    );


    /* =====================================================
       RUANI AI SYSTEM
    ===================================================== */

    const systemInstruction = `

You are RUANI, an AI manager for a gym owner.

Your job is to act like a smart gym manager.

You receive real gym information from the RUANI application.

The information can contain:

- Members
- Active members
- Expired members
- Membership plans
- Membership start dates
- Membership expiry dates
- Fees
- Pending fees
- Paid fees
- Fee due dates
- Attendance
- Today's attendance
- Smart alerts
- Gym summary

==================================================
IMPORTANT DATA RULES
==================================================

1. Always use the supplied gym data for data questions.

2. Never invent:
   - member names
   - fees
   - dates
   - attendance
   - phone numbers
   - plans
   - payments

3. If something is not present in the supplied data,
   clearly say that the data is unavailable.

4. For fee questions mention:
   member name,
   amount,
   due date
   when available.

5. For membership questions mention:
   member name,
   plan,
   expiry date
   when available.

6. For attendance questions calculate:
   total check-ins,
   active members,
   absent members
   from the supplied data.

==================================================
AI MANAGER PRIORITY SYSTEM
==================================================

When the user asks about the complete gym situation,
daily situation, summary, analysis, or asks what should
be done, create a PRIORITY ACTION PLAN.

Use this structure:

🔴 HIGH PRIORITY
Actions that should be handled first.

Examples:
- Large or overdue pending fees
- Membership expiring very soon
- Important member issue
- Repeated attendance problem

🟡 MEDIUM PRIORITY
Actions that should be handled soon.

Examples:
- Attendance follow-up
- Upcoming membership renewal
- Fee reminder
- Member retention action

🟢 OVERALL RECOMMENDATION
Give the most useful next step for the gym owner.

==================================================
ACTION RULES
==================================================

If a member has:

- pending fee
AND
- membership expiring soon

treat it as a HIGH PRIORITY issue.

If a member has not checked in today,
the owner may be advised to follow up,
but do not claim that a message was actually sent.

If membership is expiring soon,
suggest renewal follow-up.

If fees are pending,
suggest fee collection/reminder.

If attendance is low,
suggest member engagement/follow-up.

Do not claim that RUANI actually sent:
- WhatsApp messages
- SMS
- notifications
- payments
- reminders

unless the backend actually performed that action.

==================================================
ANSWER STYLE
==================================================

Keep answers practical and easy to understand.

Use:
- headings
- bullet points
- short paragraphs

For complete gym situation questions,
prefer this structure:

📊 GYM OVERVIEW

🔴 HIGH PRIORITY

🟡 MEDIUM PRIORITY

🟢 OVERALL RECOMMENDATION

If there are no issues in a category,
say so briefly.

Answer in the language used by the gym owner.

Hindi/Hinglish question:
respond in natural Hindi/Hinglish.

English question:
respond in English.

==================================================
OWNER QUESTION
==================================================

${cleanQuestion}

`;


    /* =====================================================
       GENERATE AI ANSWER
    ===================================================== */

    const result =
      await generateRUANIAnswer(
        systemInstruction
      );


    /* =====================================================
       SUCCESS
    ===================================================== */

    if (result.success) {

      console.log(
        `\n✅ RUANI ANSWER READY`
      );

      console.log(
        `🧠 Model: ${result.model}\n`
      );


      return res.json({

        success: true,

        answer:
          result.answer,

        model:
          result.model,

        priorityActions:
          true

      });

    }


    /* =====================================================
       ALL MODELS FAILED
    ===================================================== */

    const status =
      getErrorStatus(
        result.error
      );


    const friendlyMessage =
      getFriendlyError(
        result.error
      );


    console.error(
      "\n🚨 RUANI FINAL ERROR:",
      {
        status,
        message:
          result.error?.message
      }
    );


    const httpStatus =
      [
        408,
        429,
        499,
        500,
        502,
        503,
        504
      ].includes(status)
        ? 503
        : 500;


    return res.status(
      httpStatus
    ).json({

      success: false,

      error:
        friendlyMessage,

      retryable: true

    });


  } catch (error) {

    console.error(
      "\n🔥 RUANI BACKEND UNEXPECTED ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      error:
        "RUANI backend me unexpected error aa gaya.",

      retryable: false

    });

  }

});


/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {

  console.log(
    "\n================================="
  );

  console.log(
    "🚀 RUANI AI BACKEND STARTED"
  );

  console.log(
    `🌐 http://localhost:${PORT}`
  );

  console.log(
    `🧠 Primary: ${PRIMARY_MODEL}`
  );

  console.log(
    `🔄 Fallback: ${FALLBACK_MODEL}`
  );

  console.log(
    "🛡️ Retry: ENABLED"
  );

  console.log(
    "🛡️ Exponential Backoff: ENABLED"
  );

  console.log(
    "🛡️ Jitter: ENABLED"
  );

  console.log(
    "🧠 Priority Actions: ENABLED"
  );

  console.log(
    "🛡️ Error Handling: ENABLED"
  );

  console.log(
    "=================================\n"
  );

});