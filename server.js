// ======================================================
// RUANI AI + FCM BACKEND
// ======================================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";

import { GoogleGenAI } from "@google/genai";

import {
  initializeApp,
  cert
} from "firebase-admin/app";

import {
  getFirestore
} from "firebase-admin/firestore";

import {
  getMessaging
} from "firebase-admin/messaging";


// ======================================================
// ENVIRONMENT
// ======================================================

dotenv.config();

const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || "";


// ======================================================
// EXPRESS
// ======================================================

const app = express();

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json({ limit: "2mb" }));


// ======================================================
// FIREBASE ADMIN
// ======================================================

let firebaseReady = false;
let db = null;
let messaging = null;

try {

  let serviceAccount;

  // ----------------------------------------------------
  // RENDER / PRODUCTION
  // ----------------------------------------------------

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {

    serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );

    console.log(
      "☁️ Firebase service account loaded from environment"
    );

  }

  // ----------------------------------------------------
  // LOCAL DEVELOPMENT
  // ----------------------------------------------------

  else {

    const serviceAccountPath =
      "./firebase-service-account.json";

    if (!fs.existsSync(serviceAccountPath)) {

      throw new Error(
        "Firebase service account credentials not found."
      );

    }

    serviceAccount = JSON.parse(
      fs.readFileSync(
        serviceAccountPath,
        "utf8"
      )
    );

    console.log(
      "📁 Firebase service account loaded from local file"
    );

  }

  // ----------------------------------------------------
  // INITIALIZE FIREBASE
  // ----------------------------------------------------

  initializeApp({
    credential: cert(serviceAccount)
  });

  db = getFirestore();

  messaging = getMessaging();

  firebaseReady = true;

  console.log(
    "✅ Firebase Admin connected"
  );

  console.log(
    "📱 FCM enabled"
  );

}
catch (error) {

  console.error(
    "❌ Firebase Admin error:"
  );

  console.error(
    error.message
  );

}


// ======================================================
// GEMINI
// ======================================================

let ai = null;

const PRIMARY_MODEL =
  process.env.GEMINI_PRIMARY_MODEL ||
  "gemini-3.8-flash";

const FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL ||
  "gemini-3.5-flash";


if (GEMINI_API_KEY) {

  ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY
  });

  console.log(
    "🧠 Gemini enabled"
  );

}
else {

  console.log(
    "⚠️ GEMINI_API_KEY missing"
  );

}


// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {

  res.json({
    success: true,
    app: "RUANI AI + FCM Backend",
    status: "running",
    firebase: firebaseReady,
    gemini: !!ai
  });

});


// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/health", (req, res) => {

  res.json({

    success: true,

    status: "healthy",

    firebaseAdmin:
      firebaseReady,

    gemini:
      !!ai,

    fcm:
      !!messaging,

    primaryModel:
      PRIMARY_MODEL,

    fallbackModel:
      FALLBACK_MODEL,

    time:
      new Date().toISOString()

  });

});


// ======================================================
// GEMINI HELPER
// ======================================================

async function generateAIResponse(
  prompt
) {

  if (!ai) {

    throw new Error(
      "Gemini API is not configured."
    );

  }


  // ----------------------------------------------------
  // PRIMARY MODEL
  // ----------------------------------------------------

  try {

    console.log(
      `🤖 Trying primary model: ${PRIMARY_MODEL}`
    );

    const response =
      await ai.models.generateContent({

        model: PRIMARY_MODEL,

        contents: prompt

      });

    return (
      response.text ||
      "RUANI ko response nahi mila."
    );

  }

  catch (primaryError) {

    console.error(
      "⚠️ Primary Gemini error:"
    );

    console.error(
      primaryError.message
    );

  }


  // ----------------------------------------------------
  // FALLBACK MODEL
  // ----------------------------------------------------

  try {

    console.log(
      `🔄 Trying fallback model: ${FALLBACK_MODEL}`
    );

    const response =
      await ai.models.generateContent({

        model: FALLBACK_MODEL,

        contents: prompt

      });

    return (
      response.text ||
      "RUANI ko response nahi mila."
    );

  }

  catch (fallbackError) {

    console.error(
      "❌ Fallback Gemini error:"
    );

    console.error(
      fallbackError.message
    );

    throw new Error(
      "RUANI AI temporarily unavailable."
    );

  }

}


// ======================================================
// ASK RUANI
// ======================================================

app.post("/ask", async (req, res) => {

  try {

    const question =
      String(
        req.body?.question || ""
      ).trim();

    const gymData =
      req.body?.gymData || {};


    if (!question) {

      return res.status(400).json({

        success: false,

        error:
          "Question is required."

      });

    }


    if (!ai) {

      return res.status(503).json({

        success: false,

        error:
          "Gemini AI is not configured."

      });

    }


    const prompt = `
You are RUANI, an intelligent AI gym management assistant.

Your job is to help gym owners understand their gym business,
members, fees, attendance, memberships and alerts.

IMPORTANT RULES:

1. Answer based primarily on the provided gym data.
2. Never invent member names, fees, dates or attendance.
3. If information is missing, clearly say that it is unavailable.
4. Give practical and useful advice.
5. Keep answers easy to understand.
6. Use Hindi/Hinglish when the user asks in Hindi/Hinglish.
7. You can provide business suggestions when asked.
8. For numerical questions, calculate carefully.
9. Do not expose API keys, credentials or internal system details.
10. You are talking directly to a gym owner.

CURRENT GYM DATA:

${JSON.stringify(gymData, null, 2)}

GYM OWNER QUESTION:

${question}

Give the best possible RUANI response.
`;


    const answer =
      await generateAIResponse(
        prompt
      );


    return res.json({

      success: true,

      answer

    });

  }

  catch (error) {

    console.error(
      "❌ /ask error:"
    );

    console.error(
      error
    );

    return res.status(500).json({

      success: false,

      error:
        error.message ||
        "RUANI AI could not answer."

    });

  }

});


// ======================================================
// DATE HELPERS
// ======================================================

function todayString() {

  return new Date()
    .toISOString()
    .split("T")[0];

}


function daysFromToday(
  dateString
) {

  if (!dateString) {
    return null;
  }

  const today =
    new Date(todayString());

  const target =
    new Date(dateString);

  const difference =
    target.getTime() -
    today.getTime();

  return Math.ceil(
    difference /
    (1000 * 60 * 60 * 24)
  );

}


// ======================================================
// SEND FCM NOTIFICATION
// ======================================================

async function sendNotification(
  token,
  title,
  body,
  data = {}
) {

  if (!messaging) {

    console.log(
      "⚠️ FCM is not available."
    );

    return false;

  }


  try {

    await messaging.send({

      token,

      notification: {
        title,
        body
      },

      data: {
        ...Object.fromEntries(
          Object.entries(data).map(
            ([key, value]) => [
              key,
              String(value)
            ]
          )
        )
      },

      webpush: {

        notification: {
          title,
          body,
          icon: "/logo.png"
        }

      }

    });


    return true;

  }

  catch (error) {

    console.error(
      "❌ FCM send error:"
    );

    console.error(
      error.message
    );

    return false;

  }

}


// ======================================================
// TEST NOTIFICATION
// ======================================================

app.post(
  "/test-notification",
  async (req, res) => {

    try {

      const token =
        req.body?.token;

      if (!token) {

        return res.status(400).json({

          success: false,

          error:
            "FCM token is required."

        });

      }


      const sent =
        await sendNotification(

          token,

          "RUANI Test 🔔",

          "RUANI notifications are working!",

          {
            type: "test"
          }

        );


      return res.json({

        success: sent

      });

    }

    catch (error) {

      return res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ======================================================
// CHECK RUANI ALERTS
// ======================================================

async function checkRUANIAlerts() {

  if (!firebaseReady || !db) {

    console.log(
      "⚠️ Firebase not ready. Skipping alerts."
    );

    return;

  }


  try {

    console.log(
      "🔎 Checking RUANI alerts..."
    );


    const tokenSnapshot =
      await db
        .collection("fcmTokens")
        .get();


    if (tokenSnapshot.empty) {

      console.log(
        "ℹ️ No registered FCM devices found."
      );

      return;

    }


    for (
      const tokenDoc
      of tokenSnapshot.docs
    ) {

      const tokenData =
        tokenDoc.data();

      const ownerId =
        tokenData.ownerId;

      const token =
        tokenData.token;


      if (!ownerId || !token) {
        continue;
      }


      // ------------------------------------------------
      // MEMBERS
      // ------------------------------------------------

      const membersSnapshot =
        await db
          .collection("members")
          .where(
            "ownerId",
            "==",
            ownerId
          )
          .get();


      const members =
        membersSnapshot.docs.map(
          doc => ({
            id: doc.id,
            ...doc.data()
          })
        );


      // ------------------------------------------------
      // FEES
      // ------------------------------------------------

      const feesSnapshot =
        await db
          .collection("fees")
          .where(
            "ownerId",
            "==",
            ownerId
          )
          .get();


      const fees =
        feesSnapshot.docs.map(
          doc => ({
            id: doc.id,
            ...doc.data()
          })
        );


      // ------------------------------------------------
      // MEMBERSHIP EXPIRY
      // ------------------------------------------------

      for (
        const member
        of members
      ) {

        const expiryDate =
          member.expiryDate ||
          member.membershipExpiry ||
          member.endDate;

        const daysLeft =
          daysFromToday(
            expiryDate
          );


        if (
          daysLeft !== null &&
          daysLeft >= 0 &&
          daysLeft <= 3
        ) {

          const message =
            `${member.name || "Member"} membership ${
              daysLeft === 0
                ? "aaj expire ho rahi hai"
                : `${daysLeft} din me expire hogi`
            }.`;

          await sendNotification(

            token,

            "Membership Alert ⚠️",

            message,

            {
              type:
                "membership_expiry",

              memberId:
                member.id

            }

          );

        }

      }


      // ------------------------------------------------
      // PENDING FEES
      // ------------------------------------------------

      const pendingFees =
        fees.filter(
          fee =>
            fee.status === "pending" ||
            fee.status === "unpaid" ||
            fee.paid === false
        );


      if (
        pendingFees.length > 0
      ) {

        await sendNotification(

          token,

          "Pending Fees 💰",

          `${pendingFees.length} fee record${
            pendingFees.length > 1
              ? "s"
              : ""
          } pending hai.`,

          {
            type:
              "pending_fees",

            count:
              pendingFees.length

          }

        );

      }

    }

  }

  catch (error) {

    console.error(
      "❌ Alert checker error:"
    );

    console.error(
      error.message
    );

  }

}


// ======================================================
// AUTOMATIC ALERT CHECK
// ======================================================

setTimeout(
  () => {

    checkRUANIAlerts();

  },
  5000
);


setInterval(
  () => {

    checkRUANIAlerts();

  },
  60 * 60 * 1000
);


// ======================================================
// START SERVER
// ======================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log("");
    console.log(
      "======================================"
    );

    console.log(
      "🚀 RUANI AI + FCM BACKEND STARTED"
    );

    console.log(
      "======================================"
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
      `📱 FCM: ${
        messaging
          ? "ENABLED"
          : "DISABLED"
      }`
    );

    console.log(
      `🔐 Firebase Admin: ${
        firebaseReady
          ? "ENABLED"
          : "DISABLED"
      }`
    );

    console.log(
      `🤖 Gemini: ${
        ai
          ? "ENABLED"
          : "DISABLED"
      }`
    );

    console.log(
      "======================================"
    );

  }
);