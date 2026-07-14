import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { rawText, name } = await req.json();
    if (!rawText) {
      return new Response(JSON.stringify({ error: "No text provided" }), { status: 400 });
    }

    let structuredProfile = {
      skills: "[]",
      experience: "[]",
      projects: "[]",
      achievements: "[]",
      tools: "[]"
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an expert career coach. Parse the following free-text profile into a structured JSON format. 
      The JSON must have these exact keys: "skills" (array of strings), "experience" (array of strings), "projects" (array of strings), "achievements" (array of strings), "tools" (array of strings).
      IMPORTANT: Return ONLY raw, valid JSON. Do not wrap it in markdown code blocks. DO NOT use double quotes inside the string values. Replace any internal double quotes with single quotes. The JSON structure itself must use double quotes.
      
      User Profile Text:
      ${rawText}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      let jsonText = response.text;
      jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const parsed = JSON.parse(jsonText);
        structuredProfile = {
          skills: JSON.stringify(parsed.skills || []),
          experience: JSON.stringify(parsed.experience || []),
          projects: JSON.stringify(parsed.projects || []),
          achievements: JSON.stringify(parsed.achievements || []),
          tools: JSON.stringify(parsed.tools || [])
        };
      } catch (e) {
        console.error("JSON parsing failed for Gemini response:", e);
        console.log("Raw Output:", jsonText);
      }
    } else {
      console.warn("No GEMINI_API_KEY found, saving raw text only with empty structured fields.");
    }

    const profileName = name && name.trim() ? name.trim() : "My Profile";

    const profile = await prisma.profile.create({
      data: {
        name: profileName,
        rawText,
        ...structuredProfile
      }
    });

    return new Response(JSON.stringify({ success: true, profile }), { status: 200 });

  } catch (error) {
    console.error("Profile API Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

export async function GET() {
  try {
    const profiles = await prisma.profile.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return new Response(JSON.stringify({ profiles }), { status: 200 });
  } catch (error) {
    console.error("Profile API Error (GET):", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return new Response(JSON.stringify({ error: "Profile ID required" }), { status: 400 });
    }

    await prisma.profile.delete({
      where: { id }
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Profile API Error (DELETE):", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, name } = await req.json();
    if (!id || !name) {
      return new Response(JSON.stringify({ error: "ID and name are required" }), { status: 400 });
    }

    const profile = await prisma.profile.update({
      where: { id },
      data: { name: name.trim() }
    });

    return new Response(JSON.stringify({ success: true, profile }), { status: 200 });
  } catch (error) {
    console.error("Profile API Error (PUT):", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
