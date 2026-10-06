// ======================================================
// RUANI AI 2.0 + FCM BACKEND
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
    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ]
  })
);

app.use(
  express.json({
    limit: "2mb"
  })
);


// ======================================================
// FIREBASE ADMIN
// ======================================================

let firebaseReady = false;
let db = null;
let messaging = null;
let adminApp = null;

try {

  let serviceAccount;

  if (
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ) {

    serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );

    console.log(
      "☁️ Firebase service account loaded from environment"
    );

  } else {

    const serviceAccountPath =
      "./firebase-service-account.json";

    if (
      !fs.existsSync(serviceAccountPath)
    ) {

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


  adminApp = initializeApp({
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

} else {

  console.log(
    "⚠️ GEMINI_API_KEY missing"
  );

}


// ======================================================
// AUTH HELPER
// ======================================================

async function verifyFirebaseUser(
  req
) {

  if (!firebaseReady || !adminApp) {

    throw new Error(
      "Firebase Admin is not available."
    );

  }


  const authorization =
    req.headers.authorization || "";


  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {

    const error =
      new Error(
        "Authentication token missing."
      );

    error.status = 401;

    throw error;

  }


  const idToken =
    authorization
      .substring(7)
      .trim();


  if (!idToken) {

    const error =
      new Error(
        "Authentication token missing."
      );

    error.status = 401;

    throw error;

  }


  try {

    // Firebase Admin SDK dynamically exposes
    // verifyIdToken through the auth service.

    const {
      getAuth
    } = await import(
      "firebase-admin/auth"
    );

    const decodedToken =
      await getAuth(
        adminApp
      ).verifyIdToken(
        idToken
      );


    return decodedToken;

  }
  catch (error) {

    const authError =
      new Error(
        "Invalid or expired authentication token."
      );

    authError.status = 401;

    throw authError;

  }

}


// ======================================================
// HOME
// ======================================================

app.get(
  "/",
  (req, res) => {

    res.json({

      success: true,

      app:
        "RUANI AI 2.0 + FCM Backend",

      status:
        "running",

      firebase:
        firebaseReady,

      gemini:
        !!ai

    });

  }
);


// ======================================================
// HEALTH
// ======================================================

app.get(
  "/health",
  (req, res) => {

    res.json({

      success: true,

      status:
        "healthy",

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

      aiVersion:
        "2.0",

      time:
        new Date().toISOString()

    });

  }
);


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
  // PRIMARY
  // ----------------------------------------------------

  try {

    console.log(
      `🤖 Trying primary model: ${PRIMARY_MODEL}`
    );

    const response =
      await ai.models.generateContent({

        model:
          PRIMARY_MODEL,

        contents:
          prompt

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
  // FALLBACK
  // ----------------------------------------------------

  try {

    console.log(
      `🔄 Trying fallback model: ${FALLBACK_MODEL}`
    );

    const response =
      await ai.models.generateContent({

        model:
          FALLBACK_MODEL,

        contents:
          prompt

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
    new Date(
      todayString()
    );


  const target =
    new Date(
      dateString
    );


  if (
    Number.isNaN(
      target.getTime()
    )
  ) {

    return null;

  }


  const difference =
    target.getTime() -
    today.getTime();


  return Math.ceil(
    difference /
    (1000 * 60 * 60 * 24)
  );

}


// ======================================================
// LOAD OWNER DATA
// ======================================================

async function loadOwnerGymData(
  ownerId
) {

  if (
    !firebaseReady ||
    !db
  ) {

    throw new Error(
      "Firebase database is unavailable."
    );

  }


  // ----------------------------------------------------
  // MEMBERS
  // ----------------------------------------------------

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

        id:
          doc.id,

        ...doc.data()

      })
    );


  // ----------------------------------------------------
  // FEES
  // ----------------------------------------------------

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

        id:
          doc.id,

        ...doc.data()

      })
    );


  // ----------------------------------------------------
  // ATTENDANCE
  // ----------------------------------------------------

  const attendanceSnapshot =
    await db
      .collection("attendance")
      .where(
        "ownerId",
        "==",
        ownerId
      )
      .get();


  const attendance =
    attendanceSnapshot.docs.map(
      doc => ({

        id:
          doc.id,

        ...doc.data()

      })
    );


  return {
    members,
    fees,
    attendance
  };

}


// ======================================================
// BUILD AI BUSINESS INTELLIGENCE
// ======================================================

function buildBusinessIntelligence(
  data
) {

  const {
    members = [],
    fees = [],
    attendance = []
  } = data;


  const today =
    todayString();


  // ----------------------------------------------------
  // MEMBERS
  // ----------------------------------------------------

  const activeMembers =
    members.filter(
      member => {

        const endDate =
          member.endDate ||
          member.expiryDate ||
          member.membershipExpiry;


        if (!endDate) {

          return true;

        }


        const days =
          daysFromToday(
            endDate
          );


        return (
          days !== null &&
          days >= 0
        );

      }
    );


  const expiredMembers =
    members.filter(
      member => {

        const endDate =
          member.endDate ||
          member.expiryDate ||
          member.membershipExpiry;


        if (!endDate) {

          return false;

        }


        const days =
          daysFromToday(
            endDate
          );


        return (
          days !== null &&
          days < 0
        );

      }
    );


  const expiring7Days =
    members.filter(
      member => {

        const endDate =
          member.endDate ||
          member.expiryDate ||
          member.membershipExpiry;


        const days =
          daysFromToday(
            endDate
          );


        return (
          days !== null &&
          days >= 0 &&
          days <= 7
        );

      }
    );


  const expiring30Days =
    members.filter(
      member => {

        const endDate =
          member.endDate ||
          member.expiryDate ||
          member.membershipExpiry;


        const days =
          daysFromToday(
            endDate
          );


        return (
          days !== null &&
          days >= 0 &&
          days <= 30
        );

      }
    );


  // ----------------------------------------------------
  // ATTENDANCE
  // ----------------------------------------------------

  const todayAttendance =
    attendance.filter(
      record =>
        record.date === today
    );


  const todayAttendanceMemberIds =
    new Set(
      todayAttendance.map(
        record =>
          record.memberId
      )
    );


  const inactiveMembers =
    activeMembers.filter(
      member =>
        !todayAttendanceMemberIds.has(
          member.id
        )
    );


  // ----------------------------------------------------
  // FEES
  // ----------------------------------------------------

  const pendingFees =
    fees.filter(
      fee =>
        fee.status === "pending" ||
        fee.status === "unpaid" ||
        fee.paid === false
    );


  const paidFees =
    fees.filter(
      fee =>
        fee.status === "paid" ||
        fee.paid === true
    );


  const pendingAmount =
    pendingFees.reduce(
      (total, fee) =>
        total +
        Number(
          fee.amount || 0
        ),
      0
    );


  const paidAmount =
    paidFees.reduce(
      (total, fee) =>
        total +
        Number(
          fee.amount || 0
        ),
      0
    );


  // ----------------------------------------------------
  // SMART PRIORITIES
  // ----------------------------------------------------

  const priorities = [];


  if (
    pendingAmount > 0
  ) {

    priorities.push({

      priority:
        "HIGH",

      type:
        "fees",

      message:
        `₹${pendingAmount} fees pending hain.`

    });

  }


  if (
    expiring7Days.length > 0
  ) {

    priorities.push({

      priority:
        "HIGH",

      type:
        "renewal",

      message:
        `${expiring7Days.length} membership 7 din ke andar expire hogi.`

    });

  }


  if (
    inactiveMembers.length > 0
  ) {

    priorities.push({

      priority:
        "MEDIUM",

      type:
        "attendance",

      message:
        `${inactiveMembers.length} active members ne aaj attendance nahi ki.`

    });

  }


  if (
    expiring30Days.length > 0
  ) {

    priorities.push({

      priority:
        "MEDIUM",

      type:
        "future_renewal",

      message:
        `${expiring30Days.length} memberships next 30 days mein expire hongi.`

    });

  }


  return {

    summary: {

      totalMembers:
        members.length,

      activeMembers:
        activeMembers.length,

      expiredMembers:
        expiredMembers.length,

      todayAttendance:
        todayAttendance.length,

      totalAttendanceRecords:
        attendance.length,

      inactiveActiveMembersToday:
        inactiveMembers.length,

      pendingFeeRecords:
        pendingFees.length,

      pendingFeeAmount:
        pendingAmount,

      paidFeeRecords:
        paidFees.length,

      paidFeeAmount:
        paidAmount,

      expiryWithin7Days:
        expiring7Days.length,

      expiryWithin30Days:
        expiring30Days.length

    },


    priorities,

    members: members.map(
      member => ({

        id:
          member.id,

        name:
          member.name || "",

        phone:
          member.phone || "",

        plan:
          member.plan || "",

        startDate:
          member.startDate || "",

        endDate:
          member.endDate ||
          member.expiryDate ||
          member.membershipExpiry ||
          "",

        daysUntilExpiry:
          daysFromToday(
            member.endDate ||
            member.expiryDate ||
            member.membershipExpiry
          ),

        attendedToday:
          todayAttendanceMemberIds.has(
            member.id
          )

      })
    ),


    fees: fees.map(
      fee => ({

        id:
          fee.id,

        memberId:
          fee.memberId || "",

        memberName:
          fee.memberName || "",

        amount:
          Number(
            fee.amount || 0
          ),

        dueDate:
          fee.dueDate || "",

        status:
          fee.status || ""

      })
    ),


    attendance: attendance.map(
      record => ({

        memberId:
          record.memberId || "",

        memberName:
          record.memberName || "",

        date:
          record.date || "",

        timestamp:
          record.timestamp || ""

      })
    )

  };

}


// ======================================================
// ASK RUANI — AI 2.0
// ======================================================

app.post(
  "/ask",
  async (req, res) => {

    try {

      // ------------------------------------------------
      // AUTHENTICATION
      // ------------------------------------------------

      const user =
        await verifyFirebaseUser(
          req
        );


      const ownerId =
        user.uid;


      // ------------------------------------------------
      // QUESTION
      // ------------------------------------------------

      const question =
        String(
          req.body?.question || ""
        ).trim();


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


      // ------------------------------------------------
      // LOAD REAL FIRESTORE DATA
      // ------------------------------------------------

      const rawData =
        await loadOwnerGymData(
          ownerId
        );


      // ------------------------------------------------
      // BUILD INTELLIGENCE
      // ------------------------------------------------

      const intelligence =
        buildBusinessIntelligence(
          rawData
        );


      // ------------------------------------------------
      // AI PROMPT
      // ------------------------------------------------

      const prompt = `

You are RUANI — an AI Business Manager built specifically
for gym owners.

You are NOT a generic chatbot.

Your job is to understand the gym owner's actual business
and help them make better decisions.

TODAY:
${todayString()}

==================================================
GYM BUSINESS INTELLIGENCE
==================================================

${JSON.stringify(
  intelligence,
  null,
  2
)}

==================================================
IMPORTANT RULES
==================================================

1. Use ONLY the provided gym data.
2. Never invent members, amounts, dates or records.
3. Never expose private credentials or internal security details.
4. If data is missing, clearly say it is unavailable.
5. Calculate numbers carefully.
6. If the owner asks a simple question, answer directly.
7. If the owner asks for analysis, provide useful business insights.
8. Prioritize urgent issues first.
9. For fees, mention amount and useful recovery actions.
10. For memberships, identify upcoming expiry risk.
11. For attendance, identify members who may need engagement.
12. For business questions, provide practical actions.
13. Do not overwhelm the owner with unnecessary information.
14. Use Hindi/Hinglish if the owner asks in Hindi/Hinglish.
15. Keep the tone professional, friendly and confident.
16. Never claim an action was performed if RUANI only suggested it.

==================================================
RUANI AI 2.0 CAPABILITIES
==================================================

You can help with:

• Daily gym situation
• Pending fee recovery
• Membership renewal
• Expiring memberships
• Member inactivity
• Attendance trends
• Business priorities
• Daily action plan
• Revenue-related observations
• Member retention suggestions

==================================================
OWNER QUESTION
==================================================

${question}

==================================================
RESPONSE STYLE
==================================================

Give a clear answer.

When useful, structure it as:

📊 Situation
⚠️ Important Issues
🎯 What You Should Do
💡 RUANI Suggestion

Do not use all sections when they are unnecessary.

Answer the gym owner directly.
`;


      // ------------------------------------------------
      // GENERATE
      // ------------------------------------------------

      const answer =
        await generateAIResponse(
          prompt
        );


      return res.json({

        success:
          true,

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


      const status =
        error.status || 500;


      return res.status(
        status
      ).json({

        success:
          false,

        error:
          error.message ||
          "RUANI AI could not answer."

      });

    }

  }
);


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

          Object.entries(
            data
          ).map(
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

          icon:
            "/logo.png"

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

          success:
            false,

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

            type:
              "test"

          }

        );


      return res.json({

        success:
          sent

      });

    }
    catch (error) {

      return res.status(500).json({

        success:
          false,

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

  if (
    !firebaseReady ||
    !db
  ) {

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


    if (
      tokenSnapshot.empty
    ) {

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


      if (
        !ownerId ||
        !token
      ) {

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

            id:
              doc.id,

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

            id:
              doc.id,

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
            `${
              member.name ||
              "Member"
            } membership ${
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

            fee.status ===
              "pending" ||

            fee.status ===
              "unpaid" ||

            fee.paid === false
        );


      if (
        pendingFees.length > 0
      ) {

        await sendNotification(

          token,

          "Pending Fees 💰",

          `${
            pendingFees.length
          } fee record${
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
      "🚀 RUANI AI 2.0 + FCM BACKEND STARTED"
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
      "🧠 AI Intelligence: ENABLED"
    );

    console.log(
      "======================================"
    );

  }
);