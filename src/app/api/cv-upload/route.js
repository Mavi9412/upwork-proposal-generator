import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import { PDFParse } from "pdf-parse";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("cv");
    const profileName = formData.get("profileName") || "My Profile";

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });
    }

    const fileName = file.name || "";
    const fileType = file.type || "";

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";

    // Extract text based on file type
    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      const parser = new PDFParse({ data: buffer });
      const pdfData = await parser.getText();
      extractedText = pdfData.text;
    } else if (
      fileType === "text/plain" ||
      fileName.endsWith(".txt")
    ) {
      extractedText = buffer.toString("utf-8");
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported file type. Please upload a PDF or TXT file." }),
        { status: 400 }
      );
    }

    if (!extractedText.trim()) {
      return new Response(
        JSON.stringify({ error: "Could not extract text from the file. Please try a different file." }),
        { status: 400 }
      );
    }

    // Structure the profile using Gemini
    let structuredProfile = {
      skills: "[]",
      experience: "[]",
      projects: "[]",
      achievements: "[]",
      tools: "[]",
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an expert career coach. Parse the following CV/Resume text into a structured JSON format. 
      The JSON must have these exact keys: "skills" (array of strings), "experience" (array of strings describing work experience), "projects" (array of strings describing notable projects), "achievements" (array of strings describing awards/achievements), "tools" (array of strings listing software/tools/technologies used).
      Extract as much relevant information as possible from the CV.
      IMPORTANT: Return ONLY raw, valid JSON. Do not wrap it in markdown code blocks. DO NOT use double quotes inside the string values. Replace any internal double quotes with single quotes. The JSON structure itself must use double quotes.
      
      CV Text:
      ${extractedText.slice(0, 8000)}`; // Limit to 8000 chars to avoid token limits

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      let jsonText = response.text;
      // Clean up markdown block if present
      jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const parsed = JSON.parse(jsonText);
        structuredProfile = {
          skills: JSON.stringify(parsed.skills || []),
          experience: JSON.stringify(parsed.experience || []),
          projects: JSON.stringify(parsed.projects || []),
          achievements: JSON.stringify(parsed.achievements || []),
          tools: JSON.stringify(parsed.tools || []),
        };
      } catch (e) {
        console.error("JSON parsing failed for Gemini response:", e);
        console.log("Raw Output:", jsonText); // Log raw output for debugging
      }
    }

    // Save to database
    const profile = await prisma.profile.create({
      data: {
        name: profileName,
        rawText: extractedText,
        ...structuredProfile,
      },
    });

    return new Response(
      JSON.stringify({ success: true, profile, extractedTextPreview: extractedText.slice(0, 300) }),
      { status: 200 }
    );
  } catch (error) {
    console.error("CV Upload API Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error: " + error.message }),
      { status: 500 }
    );
  }
}

