// ======================================================
// RUANI AI 2.3 + FCM BACKEND
// Female AI Business Manager
// Secure Owner Authentication
// Firestore Business Intelligence
// Multi-Model Gemini Fallback
// Automatic FCM Alerts
// Duplicate Alert Protection
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
  getAuth
} from "firebase-admin/auth";

import {
  getFirestore,
  FieldValue
} from "firebase-admin/firestore";

import {
  getMessaging
} from "firebase-admin/messaging";


// ======================================================
// ENVIRONMENT
// ======================================================

dotenv.config();

const PORT =
  process.env.PORT || 3000;

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || "";


// ======================================================
// EXPRESS
// ======================================================

const app = express();

app.use(
  cors({
    origin: true,
    methods: [
      "GET",
      "POST",
      "OPTIONS"
    ],
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
let firebaseAuth = null;

try {

  let serviceAccount;

  if (
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ) {

    serviceAccount =
      JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      );

    console.log(
      "☁️ Firebase service account loaded from environment"
    );

  }

  else {

    const serviceAccountPath =
      "./firebase-service-account.json";

    if (
      !fs.existsSync(
        serviceAccountPath
      )
    ) {

      throw new Error(
        "Firebase service account credentials not found."
      );

    }

    serviceAccount =
      JSON.parse(
        fs.readFileSync(
          serviceAccountPath,
          "utf8"
        )
      );

    console.log(
      "📁 Firebase service account loaded from local file"
    );

  }


  initializeApp({
    credential:
      cert(serviceAccount)
  });


  db =
    getFirestore();


  messaging =
    getMessaging();


  firebaseAuth =
    getAuth();


  firebaseReady =
    true;


  console.log(
    "✅ Firebase Admin connected"
  );

  console.log(
    "🔐 Firebase Auth enabled"
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


const GEMINI_MODELS = [

  PRIMARY_MODEL,

  "gemini-3.7-flash",

  "gemini-3.6-flash",

  "gemini-3.5-flash",

  "gemini-3.5-flash-lite"

].filter(
  (model, index, array) =>
    array.indexOf(model) === index
);


if (GEMINI_API_KEY) {

  ai =
    new GoogleGenAI({
      apiKey:
        GEMINI_API_KEY
    });


  console.log(
    "🧠 Gemini enabled"
  );


  console.log(
    "🤖 Gemini model cascade:"
  );


  console.log(
    GEMINI_MODELS.join(
      " → "
    )
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

app.get(
  "/",
  (req, res) => {

    res.json({

      success:
        true,

      app:
        "RUANI AI + FCM Backend",

      version:
        "2.3",

      personality:
        "Female AI Business Manager",

      status:
        "running",

      firebase:
        firebaseReady,

      firebaseAuth:
        !!firebaseAuth,

      gemini:
        !!ai,

      fcm:
        !!messaging,

      models:
        GEMINI_MODELS

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

      success:
        true,

      status:
        "healthy",

      version:
        "2.3",

      personality:
        "Female AI Business Manager",

      firebaseAdmin:
        firebaseReady,

      firebaseAuth:
        !!firebaseAuth,

      gemini:
        !!ai,

      fcm:
        !!messaging,

      primaryModel:
        PRIMARY_MODEL,

      models:
        GEMINI_MODELS,

      aiIntelligence:
        true,

      secureOwnerAuthentication:
        true,

      automaticAlertProtection:
        true,

      time:
        new Date()
          .toISOString()

    });

  }
);


// ======================================================
// FIREBASE OWNER AUTHENTICATION
// ======================================================

async function verifyFirebaseUser(
  req
) {

  if (!firebaseAuth) {

    const error =
      new Error(
        "Firebase Authentication unavailable."
      );

    error.status =
      503;

    throw error;

  }


  const authorization =
    String(
      req.headers.authorization ||
      ""
    ).trim();


  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {

    const error =
      new Error(
        "Authentication token missing."
      );

    error.status =
      401;

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

    error.status =
      401;

    throw error;

  }


  try {

    const decodedToken =
      await firebaseAuth
        .verifyIdToken(
          idToken
        );


    return decodedToken;

  }

  catch (error) {

    console.error(
      "❌ Firebase token verification failed:",
      error.message
    );


    const authError =
      new Error(
        "Invalid or expired authentication token."
      );


    authError.status =
      401;


    throw authError;

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


  const today =
    new Date(
      todayString()
    );


  const difference =
    target.getTime() -
    today.getTime();


  return Math.ceil(
    difference /
    (
      1000 *
      60 *
      60 *
      24
    )
  );

}


// ======================================================
// OWNER FIRESTORE DATA
// ======================================================

async function loadOwnerGymData(
  ownerId
) {

  if (
    !db ||
    !firebaseReady
  ) {

    throw new Error(
      "Firestore is not available."
    );

  }


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


  console.log(
    `📊 Firestore loaded: ${members.length} members, ${fees.length} fees, ${attendance.length} attendance`
  );


  return {

    members,

    fees,

    attendance

  };

}


// ======================================================
// MEMBER ACTIVE CHECK
// ======================================================

function isMemberActive(
  member
) {

  const status =
    String(
      member.status ||
      ""
    )
      .toLowerCase()
      .trim();


  if (
    status === "active"
  ) {

    return true;

  }


  if (
    status === "inactive" ||
    status === "expired" ||
    status === "cancelled"
  ) {

    return false;

  }


  if (
    member.isActive === true
  ) {

    return true;

  }


  const expiryDate =
    member.expiryDate ||
    member.membershipExpiry ||
    member.endDate;


  if (expiryDate) {

    const daysLeft =
      daysFromToday(
        expiryDate
      );


    return (
      daysLeft !== null &&
      daysLeft >= 0
    );

  }


  return false;

}


// ======================================================
// FEE AMOUNT
// ======================================================

function getFeeAmount(
  fee
) {

  const amount =
    Number(
      fee.amount ??
      fee.feeAmount ??
      fee.total ??
      fee.price ??
      0
    );


  return Number.isFinite(
    amount
  )
    ? amount
    : 0;

}


// ======================================================
// PENDING FEE CHECK
// ======================================================

function isPendingFee(
  fee
) {

  const status =
    String(
      fee.status ||
      ""
    )
      .toLowerCase()
      .trim();


  if (
    status === "pending" ||
    status === "unpaid" ||
    status === "due"
  ) {

    return true;

  }


  if (
    fee.paid === false
  ) {

    return true;

  }


  if (
    status === "paid" ||
    fee.paid === true
  ) {

    return false;

  }


  return false;

}


// ======================================================
// BUSINESS INTELLIGENCE
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


  const activeMembers =
    members.filter(
      member =>
        isMemberActive(
          member
        )
    );


  const expiredMembers =
    members.filter(
      member => {

        const expiryDate =
          member.expiryDate ||
          member.membershipExpiry ||
          member.endDate;


        const daysLeft =
          daysFromToday(
            expiryDate
          );


        return (
          daysLeft !== null &&
          daysLeft < 0
        );

      }
    );


  const expiring7Days =
    activeMembers.filter(
      member => {

        const expiryDate =
          member.expiryDate ||
          member.membershipExpiry ||
          member.endDate;


        const daysLeft =
          daysFromToday(
            expiryDate
          );


        return (
          daysLeft !== null &&
          daysLeft >= 0 &&
          daysLeft <= 7
        );

      }
    );


  const expiring30Days =
    activeMembers.filter(
      member => {

        const expiryDate =
          member.expiryDate ||
          member.membershipExpiry ||
          member.endDate;


        const daysLeft =
          daysFromToday(
            expiryDate
          );


        return (
          daysLeft !== null &&
          daysLeft >= 0 &&
          daysLeft <= 30
        );

      }
    );


  const todayAttendance =
    attendance.filter(
      record => {

        const date =
          record.date ||
          record.attendanceDate ||
          record.day;


        return (
          date === today
        );

      }
    );


  const attendedMemberIds =
    new Set(
      todayAttendance
        .map(
          record =>
            record.memberId
        )
        .filter(Boolean)
    );


  const inactiveToday =
    activeMembers.filter(
      member =>
        !attendedMemberIds.has(
          member.id
        )
    );


  const pendingFees =
    fees.filter(
      isPendingFee
    );


  const paidFees =
    fees.filter(
      fee =>
        fee.paid === true ||
        String(
          fee.status ||
          ""
        )
          .toLowerCase() ===
          "paid"
    );


  const pendingAmount =
    pendingFees.reduce(
      (
        total,
        fee
      ) =>
        total +
        getFeeAmount(
          fee
        ),
      0
    );


  const paidAmount =
    paidFees.reduce(
      (
        total,
        fee
      ) =>
        total +
        getFeeAmount(
          fee
        ),
      0
    );


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
        `₹${pendingAmount} pending fee amount.`

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
        `${expiring7Days.length} membership(s) expiring within 7 days.`

    });

  }


  if (
    inactiveToday.length > 0
  ) {

    priorities.push({

      priority:
        "MEDIUM",

      type:
        "attendance",

      message:
        `${inactiveToday.length} active member(s) have not checked in today.`

    });

  }


  if (
    expiring30Days.length >
    expiring7Days.length
  ) {

    priorities.push({

      priority:
        "MEDIUM",

      type:
        "future-renewal",

      message:
        `${expiring30Days.length} membership(s) expire within 30 days.`

    });

  }


  return {

    generatedAt:
      new Date()
        .toISOString(),

    summary: {

      totalMembers:
        members.length,

      activeMembers:
        activeMembers.length,

      expiredMembers:
        expiredMembers.length,

      todayAttendance:
        todayAttendance.length,

      inactiveToday:
        inactiveToday.length,

      totalAttendanceRecords:
        attendance.length,

      totalFeeRecords:
        fees.length,

      pendingFeeRecords:
        pendingFees.length,

      paidFeeRecords:
        paidFees.length,

      pendingAmount:
        pendingAmount,

      paidAmount:
        paidAmount,

      expiring7Days:
        expiring7Days.length,

      expiring30Days:
        expiring30Days.length

    },

    priorities,

    members:
      members.map(
        member => ({

          id:
            member.id,

          name:
            member.name ||
            "Unknown",

          phone:
            member.phone ||
            "",

          plan:
            member.plan ||
            member.membershipPlan ||
            "",

          status:
            member.status ||
            "",

          active:
            isMemberActive(
              member
            ),

          expiryDate:
            member.expiryDate ||
            member.membershipExpiry ||
            member.endDate ||
            null

        })
      ),

    fees:
      fees.map(
        fee => ({

          id:
            fee.id,

          memberId:
            fee.memberId ||
            "",

          amount:
            getFeeAmount(
              fee
            ),

          status:
            fee.status ||
            "",

          paid:
            fee.paid === true

        })
      ),

    attendance:
      attendance.map(
        record => ({

          id:
            record.id,

          memberId:
            record.memberId ||
            "",

          date:
            record.date ||
            record.attendanceDate ||
            record.day ||
            null,

          status:
            record.status ||
            ""

        })
      )

  };

}


// ======================================================
// GEMINI ERROR STATUS
// ======================================================

function getErrorStatus(
  error
) {

  const status =
    Number(
      error?.status ??
      error?.code ??
      error?.error?.code ??
      0
    );


  if (
    Number.isFinite(status) &&
    status > 0
  ) {

    return status;

  }


  const message =
    String(
      error?.message ||
      ""
    )
      .toLowerCase();


  if (
    message.includes(
      "quota"
    ) ||
    message.includes(
      "resource_exhausted"
    ) ||
    message.includes(
      "429"
    )
  ) {

    return 429;

  }


  if (
    message.includes(
      "unavailable"
    ) ||
    message.includes(
      "503"
    )
  ) {

    return 503;

  }


  return 500;

}


// ======================================================
// RETRYABLE GEMINI ERROR
// ======================================================

function isRetryableGeminiError(
  error
) {

  const status =
    getErrorStatus(
      error
    );


  return [
    408,
    429,
    500,
    502,
    503,
    504
  ].includes(
    status
  );

}


// ======================================================
// FRIENDLY GEMINI ERROR
// ======================================================

function getFriendlyGeminiError(
  error
) {

  const status =
    getErrorStatus(
      error
    );


  if (
    status === 429
  ) {

    return (
      "RUANI AI ka current Gemini quota temporarily exhausted hai. " +
      "RUANI ne available fallback models bhi try kiye. " +
      "Thodi der baad dobara try karo."
    );

  }


  if (
    status === 503
  ) {

    return (
      "RUANI AI model abhi high demand mein hai. " +
      "Please thodi der baad dobara try karo."
    );

  }


  return (
    "RUANI AI abhi answer generate nahi kar pa rahi. Please dobara try karo."
  );

}


// ======================================================
// GENERATE WITH ONE MODEL
// ======================================================

async function generateWithModel(
  model,
  prompt
) {

  if (!ai) {

    throw new Error(
      "Gemini API is not configured."
    );

  }


  console.log(
    `🤖 Trying model: ${model}`
  );


  try {

    const response =
      await ai.models.generateContent({

        model,

        contents:
          prompt

      });


    const answer =
      String(
        response?.text ||
        ""
      ).trim();


    if (!answer) {

      throw new Error(
        `Model ${model} returned an empty response.`
      );

    }


    console.log(
      `✅ Model successful: ${model}`
    );


    return {

      success:
        true,

      answer,

      model

    };

  }

  catch (error) {

    const status =
      getErrorStatus(
        error
      );


    console.error(
      `❌ Gemini error | ${model} | status ${status}`
    );


    console.error(
      error?.message ||
      error
    );


    throw error;

  }

}


// ======================================================
// MULTI MODEL RUANI AI
// ======================================================

async function generateRUANIAnswer(
  prompt
) {

  if (!ai) {

    return {

      success:
        false,

      error:
        new Error(
          "Gemini API is not configured."
        )

    };

  }


  let lastError =
    null;


  for (
    const model
    of GEMINI_MODELS
  ) {

    try {

      const result =
        await generateWithModel(
          model,
          prompt
        );


      return result;

    }

    catch (error) {

      lastError =
        error;


      const status =
        getErrorStatus(
          error
        );


      if (
        status === 429
      ) {

        console.log(
          `⚠️ ${model} quota/rate limit reached. Moving to next model.`
        );

        continue;

      }


      if (
        status === 503
      ) {

        console.log(
          `⚠️ ${model} temporarily unavailable. Moving to next model.`
        );

        continue;

      }


      if (
        isRetryableGeminiError(
          error
        )
      ) {

        console.log(
          `⚠️ ${model} retryable error. Moving to next model.`
        );

        continue;

      }


      console.log(
        `🛑 ${model} returned non-retryable error.`
      );

      break;

    }

  }


  return {

    success:
      false,

    error:
      lastError ||
      new Error(
        "All Gemini models failed."
      )

  };

}


// ======================================================
// RUANI PERSONALITY + VOICE PROMPT
// ======================================================

function buildRUANIPrompt(
  question,
  intelligence
) {

  return `

You are RUANI.

==================================================
RUANI IDENTITY
==================================================

RUANI is a FEMALE AI Business Manager created specifically
for gym owners.

RUANI is not a generic chatbot.

She is the gym owner's intelligent business assistant who
understands the gym's real business data and helps the owner
make better decisions.

RUANI has a feminine personality, but she must remain
professional and business-focused.

Think of RUANI as:

"Smart female AI business manager + caring professional
assistant + practical gym business advisor."

==================================================
RUANI PERSONALITY
==================================================

RUANI is:

• Intelligent
• Calm
• Confident
• Friendly
• Supportive
• Practical
• Proactive
• Business-focused
• Respectful
• Slightly warm and feminine
• Never childish
• Never overly emotional
• Never overly formal

RUANI should feel like a smart professional who understands
the gym owner's business and genuinely wants to help the owner
improve it.

==================================================
FEMININE VOICE
==================================================

RUANI is a female AI.

When naturally appropriate, feminine Hindi expressions may
be used.

Examples:

"Maine aapke gym ka data check kiya hai."

"Main suggest karungi ki..."

"Meri recommendation hai..."

"Ek cheez aur notice hui hai..."

Do not overuse feminine phrases.

Do not repeatedly say:

"main ladki hoon"

"main female AI hoon"

"main soch rahi hoon"

RUANI is a professional AI business manager.

==================================================
VOICE
==================================================

RUANI should sound:

• Natural
• Clear
• Warm
• Confident
• Practical
• Helpful

Do not sound robotic.

Do not sound like a corporate report.

Do not use unnecessarily complicated words.

When the owner uses Hindi/Hinglish, use simple natural
Indian Hinglish.

When the owner uses English, answer in English.

When the owner mixes Hindi and English, use natural Hinglish.

==================================================
CORE BUSINESS BEHAVIOR
==================================================

RUANI follows this pattern:

1. Understand the owner's question.
2. Check the real gym data.
3. Identify important information.
4. Give the direct answer first.
5. Identify problems or opportunities.
6. Give practical recommendations.
7. Prioritize actions when useful.

RUANI should not simply repeat data.

She should turn data into useful business insight.

==================================================
IMPORTANT DATA RULES
==================================================

The provided Firestore business intelligence is the source
of truth.

Never invent:

- member names
- member counts
- fees
- amounts
- dates
- attendance
- membership status
- payments
- phone numbers
- business results

If information is unavailable, say:

"Ye information abhi available nahi hai."

Never expose:

- Firebase credentials
- API keys
- service account information
- authentication tokens
- backend secrets
- internal system information

Never claim RUANI sent WhatsApp, SMS, payment reminders,
calls, emails, or notifications unless the backend actually
performed that action.

Never pretend that a recommended action has already happened.

==================================================
BUSINESS INTELLIGENCE
==================================================

RUANI should think like a gym business manager.

Do not only report:

"₹1,000 pending fee hai."

When useful, connect related information:

"₹1,000 fee pending hai aur membership bhi jaldi expire ho
rahi hai. Isliye fee collection ke saath renewal conversation
karna practical rahega."

Only make connections that are supported by the data.

==================================================
ANSWER STYLE
==================================================

For simple questions:

Answer directly first.

Example:

"Abhi aapke gym mein 1 active member hai — Priyanshu Pal."

Do not create a long report for a simple question.

For business questions, use sections only when useful:

📊 CURRENT SITUATION

💡 INSIGHT

🎯 RECOMMENDATION

For complete gym situation questions:

📊 GYM OVERVIEW

🔴 HIGH PRIORITY

🟡 MEDIUM PRIORITY

🟢 RECOMMENDATION

For urgent issues, clearly explain what should be handled
first.

==================================================
PROACTIVE RECOMMENDATIONS
==================================================

If the owner asks:

"Kya karna chahiye?"

Give clear actions.

Example:

"Main ye 3 steps suggest karungi:

1. Pending fee collect karein.
2. Membership renewal discuss karein.
3. Attendance improve karne ke liye inactive members ko
   follow-up karein."

==================================================
OWNER RESPECT
==================================================

Never blame or insult the gym owner.

Instead of:

"Aapne fees collect nahi ki."

Say:

"₹1,000 fee abhi pending hai, isliye isse priority dena
better rahega."

Instead of:

"Aapka attendance bahut kharab hai."

Say:

"Aaj attendance gap hai — kuch active members abhi
check-in nahi hue hain."

==================================================
NO FAKE EMOTIONS
==================================================

RUANI may be warm and friendly.

But she must never claim:

"I love you."

"I miss you."

"I am emotionally attached to you."

"I need you."

"I am your girlfriend."

RUANI is a professional AI business manager.

==================================================
NO GENERIC AI DISCLAIMERS
==================================================

Do not repeatedly say:

"As an AI..."

"I am an AI language model..."

unless the owner specifically asks about RUANI's identity
or capabilities.

==================================================
RUANI CORE PROMISE
==================================================

RUANI should help the gym owner move from:

DATA
↓
UNDERSTANDING
↓
PRIORITY
↓
ACTION

RUANI is not just answering questions.

RUANI helps the gym owner understand the business and decide
what to do next.

==================================================
REAL GYM BUSINESS DATA
==================================================

${JSON.stringify(
  intelligence,
  null,
  2
)}

==================================================
OWNER QUESTION
==================================================

${question}

==================================================
FINAL INSTRUCTION
==================================================

Answer the owner's question as RUANI.

Be natural.

Be intelligent.

Be concise when the question is simple.

Be detailed when the business situation requires it.

Use real Firestore data only.

Do not invent anything.

Give practical business advice when useful.

Speak directly to the gym owner.

Maintain RUANI's feminine, warm, confident and professional
personality throughout the response.

`;
}


// ======================================================
// ASK RUANI
// ======================================================

app.post(
  "/ask",
  async (req, res) => {

    try {

      console.log(
        "========================================"
      );


      console.log(
        "📩 /ask request received"
      );


      const decodedUser =
        await verifyFirebaseUser(
          req
        );


      const ownerId =
        decodedUser.uid;


      console.log(
        "🔐 Authenticated owner successfully"
      );


      const question =
        String(
          req.body?.question ||
          ""
        ).trim();


      if (!question) {

        return res.status(
          400
        ).json({

          success:
            false,

          error:
            "Question required hai."

        });

      }


      if (
        question.length >
        15000
      ) {

        return res.status(
          400
        ).json({

          success:
            false,

          error:
            "Question bahut long hai."

        });

      }


      if (!ai) {

        return res.status(
          503
        ).json({

          success:
            false,

          error:
            "Gemini AI configured nahi hai.",

          retryable:
            false

        });

      }


      const gymData =
        await loadOwnerGymData(
          ownerId
        );


      console.log(
        `📊 Firestore loaded: ${gymData.members.length} members, ${gymData.fees.length} fees, ${gymData.attendance.length} attendance`
      );


      const intelligence =
        buildBusinessIntelligence(
          gymData
        );


      console.log(
        "🧠 Business intelligence generated"
      );


      const prompt =
        buildRUANIPrompt(
          question,
          intelligence
        );


      const result =
        await generateRUANIAnswer(
          prompt
        );


      if (
        result.success
      ) {

        console.log(
          `✅ RUANI answer ready using ${result.model}`
        );


        return res.json({

          success:
            true,

          answer:
            result.answer,

          model:
            result.model,

          priorityActions:
            true

        });

      }


      const status =
        getErrorStatus(
          result.error
        );


      const friendlyError =
        getFriendlyGeminiError(
          result.error
        );


      console.error(
        "🚨 All Gemini models failed:",
        {
          status,

          message:
            result.error?.message
        }
      );


      return res.status(
        status === 429
          ? 429
          : 503
      ).json({

        success:
          false,

        error:
          friendlyError,

        retryable:
          true,

        quotaIssue:
          status === 429

      });

    }

    catch (error) {

      console.error(
        "🔥 /ask error:"
      );


      console.error(
        error
      );


      const status =
        Number(
          error?.status ||
          500
        );


      return res.status(
        status >= 400 &&
        status < 600
          ? status
          : 500
      ).json({

        success:
          false,

        error:
          error.message ||
          "RUANI backend error.",

        retryable:
          status === 429 ||
          status === 503

      });

    }

  }
);


// ======================================================
// FCM SEND
// ======================================================

async function sendNotification(
  token,
  title,
  body,
  data = {}
) {

  if (!messaging) {

    console.log(
      "⚠️ FCM unavailable."
    );

    return false;

  }


  if (!token) {

    return false;

  }


  try {

    await messaging.send({

      token,

      notification: {

        title,

        body

      },

      data:

        Object.fromEntries(

          Object.entries(
            data
          ).map(
            (
              [key, value]
            ) => [

              key,

              String(
                value
              )

            ]
          )

        ),

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
// DUPLICATE ALERT PROTECTION
// ======================================================

async function sendProtectedNotification(
  ownerId,
  token,
  type,
  uniqueKey,
  title,
  body,
  data = {}
) {

  if (
    !db ||
    !messaging
  ) {

    return false;

  }


  const safeKey =
    String(
      uniqueKey
    )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );


  const logId =
    `${ownerId}_${type}_${safeKey}`;


  const logRef =
    db
      .collection(
        "notificationLogs"
      )
      .doc(
        logId
      );


  const existing =
    await logRef.get();


  if (
    existing.exists
  ) {

    console.log(
      `⏭️ Duplicate notification skipped: ${type} ${safeKey}`
    );


    return false;

  }


  const sent =
    await sendNotification(
      token,
      title,
      body,
      data
    );


  if (sent) {

    await logRef.set({

      ownerId,

      type,

      uniqueKey:
        safeKey,

      sentAt:
        FieldValue.serverTimestamp()

    });


    console.log(
      `🔔 Notification sent: ${type} ${safeKey}`
    );

  }


  return sent;

}


// ======================================================
// AUTOMATIC ALERT CHECKER
// ======================================================

async function checkAutomaticNotifications() {

  if (
    !firebaseReady ||
    !db ||
    !messaging
  ) {

    console.log(
      "⚠️ Firebase/FCM not ready. Skipping alerts."
    );


    return;

  }


  try {

    console.log(
      "🔎 Checking RUANI automatic alerts..."
    );


    const tokenSnapshot =
      await db
        .collection(
          "fcmTokens"
        )
        .get();


    if (
      tokenSnapshot.empty
    ) {

      console.log(
        "ℹ️ No registered FCM devices."
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


      let data;


      try {

        data =
          await loadOwnerGymData(
            ownerId
          );

      }

      catch (error) {

        console.error(
          `⚠️ Could not load data for owner: ${ownerId}`
        );


        continue;

      }


      const members =
        data.members;


      const fees =
        data.fees;


      const today =
        todayString();


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

          const memberId =
            member.id;


          const message =
            daysLeft === 0

              ? `${member.name || "Member"} ki membership aaj expire ho rahi hai.`

              : `${member.name || "Member"} ki membership ${daysLeft} din mein expire hogi.`;


          const uniqueKey =
            `${today}_${memberId}_${daysLeft}`;


          await sendProtectedNotification(

            ownerId,

            token,

            "membership-expiry",

            uniqueKey,

            "Membership Alert ⚠️",

            message,

            {

              type:
                "membership_expiry",

              memberId

            }

          );

        }

      }


      // ------------------------------------------------
      // PENDING FEES
      // ------------------------------------------------

      const pendingFees =
        fees.filter(
          isPendingFee
        );


      if (
        pendingFees.length >
        0
      ) {

        const pendingAmount =
          pendingFees.reduce(
            (
              total,
              fee
            ) =>
              total +
              getFeeAmount(
                fee
              ),
            0
          );


        const uniqueKey =
          `${today}_${pendingFees.length}_${pendingAmount}`;


        await sendProtectedNotification(

          ownerId,

          token,

          "pending-fees",

          uniqueKey,

          "Pending Fees 💰",

          `₹${pendingAmount} pending fees hain (${pendingFees.length} record${pendingFees.length > 1 ? "s" : ""}).`,

          {

            type:
              "pending_fees",

            count:
              pendingFees.length

          }

        );

      }


      // ------------------------------------------------
      // NO ATTENDANCE
      // ------------------------------------------------

      const activeMembers =
        members.filter(
          isMemberActive
        );


      if (
        activeMembers.length >
        0
      ) {

        const attendanceSnapshot =
          await db
            .collection(
              "attendance"
            )
            .where(
              "ownerId",
              "==",
              ownerId
            )
            .where(
              "date",
              "==",
              today
            )
            .get();


        const attendedIds =
          new Set(
            attendanceSnapshot.docs
              .map(
                doc =>
                  doc.data()
                    .memberId
              )
              .filter(Boolean)
          );


        const absentCount =
          activeMembers.filter(
            member =>
              !attendedIds.has(
                member.id
              )
          ).length;


        if (
          absentCount >
          0
        ) {

          const uniqueKey =
            `${today}_${absentCount}`;


          await sendProtectedNotification(

            ownerId,

            token,

            "no-attendance",

            uniqueKey,

            "Today's Attendance 🏋️",

            `${absentCount} active member${absentCount > 1 ? "s" : ""} ne aaj check-in nahi kiya.`,

            {

              type:
                "no_attendance",

              count:
                absentCount

            }

          );

        }

      }

    }


    console.log(
      "✅ Automatic notification check completed"
    );

  }

  catch (error) {

    console.error(
      "❌ Automatic notification checker error:"
    );


    console.error(
      error
    );

  }

}


// ======================================================
// TEST NOTIFICATION
// ======================================================

app.post(
  "/test-notification",
  async (req, res) => {

    try {

    


      const decodedUser =
        await verifyFirebaseUser(
          req
        );


      const ownerId =
        decodedUser.uid;


      const tokenDoc =
        await db
          .collection(
            "fcmTokens"
          )
          .doc(
            ownerId
          )
          .get();


      if (
        !tokenDoc.exists
      ) {

        return res.status(
          404
        ).json({

          success:
            false,

          error:
            "FCM token nahi mila. Pehle notifications enable karo."

        });

      }


      const tokenData =
        tokenDoc.data();


      const token =
        tokenData.token;


      if (!token) {

        return res.status(
          404
        ).json({

          success:
            false,

          error:
            "FCM token unavailable."

        });

      }


      const sent =
        await sendNotification(

          token,

          "RUANI Test 🔔",

          "RUANI notifications successfully working!",

          {

            type:
              "test"

          }

        );


      return res.json({

        success:
          sent,

        message:
          sent

            ? "Notification sent successfully."

            : "Notification send nahi hui."

      });

    }

    catch (error) {

      console.error(
        "❌ Test notification error:",
        error.message
      );


      return res.status(
        error.status ||
        500
      ).json({

        success:
          false,

        error:
          error.message

      });

    }

  }
);


// ======================================================
// AUTOMATIC CHECK
// ======================================================

setTimeout(
  () => {

    checkAutomaticNotifications();

  },
  10000
);


setInterval(
  () => {

    checkAutomaticNotifications();

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
      "=========================================="
    );


    console.log(
      "🚀 RUANI AI 2.3 BACKEND STARTED"
    );


    console.log(
      "=========================================="
    );


    console.log(
      `🌐 Port: ${PORT}`
    );


    console.log(
      `🤖 Primary: ${PRIMARY_MODEL}`
    );


    console.log(
      `🔄 Models: ${GEMINI_MODELS.join(" → ")}`
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
      `🔑 Firebase Auth: ${
        firebaseAuth
          ? "ENABLED"
          : "DISABLED"
      }`
    );


    console.log(
      "🧠 AI Intelligence: ENABLED"
    );


    console.log(
      "👩 RUANI Female AI Personality: ENABLED"
    );


    console.log(
      "🛡️ Secure owner authentication: ENABLED"
    );


    console.log(
      "🛡️ Automatic alert protection: ENABLED"
    );


    console.log(
      "=========================================="
    );

  }
);