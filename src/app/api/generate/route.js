import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { rawText, mode, style, isShort, profileId, noProfile } = await req.json();
    if (!rawText) return new Response(JSON.stringify({ error: "Missing job text" }), { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;

    // Save job post to DB
    const jobPost = await prisma.jobPost.create({
      data: { rawText }
    });

    // Fetch profile, unless the user explicitly chose to generate without one
    let profile = null;
    if (!noProfile) {
      if (profileId) {
        profile = await prisma.profile.findUnique({ where: { id: profileId } });
      } else {
        profile = await prisma.profile.findFirst({ orderBy: { createdAt: 'desc' } });
      }
    }

    let generatedContent = "Mock proposal generated. Please set GEMINI_API_KEY in the .env file to generate real proposals.";

    if (!profile && !noProfile) {
      generatedContent = "Please create your profile first on the Onboarding page.";
    } else if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      
      const toneInstruction = mode === "Confident"
        ? "Be highly persuasive, confident, and connect transferable skills creatively. Embellish appropriately if it helps secure the interview, but maintain a professional tone."
        : "Be completely honest and stick strictly to the exact skills and experiences listed in the profile. Do not invent or embellish anything.";

      const humanizationInstruction = `MANDATORY RULES, not style suggestions. Every single one must hold true in the final text, with zero exceptions. Write like a real freelancer typing this themselves, not like an AI:
      - Never use AI cliche phrases: "I hope this message finds you well", "In today's fast-paced world", "It's important to note", "Furthermore", "Moreover", "delve into", "In conclusion".
      - Vary sentence length on purpose: mix short punchy sentences with longer ones, don't make every sentence the same length.
      - Adopt the persona of a freelancer with real hands-on experience: casual-professional tone, first person, contractions allowed (I've, I'm, don't).
      - Don't over-polish: a slightly imperfect, natural flow reads more human than a too-clean, uniformly structured paragraph.
      - Write in flowing paragraphs only. No bold text, no bullet points, no subheaders.
      - Completely ban every contrastive "X but Y" construction, in any phrasing: "not just X, it's Y", "not only X, but also Y", "isn't just X, but Y", "X, but more importantly Y". Zero occurrences allowed, not even once.
      - Don't ask a rhetorical question and then answer it yourself (e.g. "You might be thinking...").
      - Use exactly ONE number/stat in the entire proposal, not two, not three. Pick the single strongest one and drop the rest.
      - End with a specific question tied to the actual job post, not a generic "let's hop on a call" close.
      - Never use an em dash (—) or en dash (–) anywhere. Use a comma, period, or parentheses instead.
      - Before finalizing, silently check your own draft against these rules and rewrite any sentence that breaks one.`;

      const styleInstruction = style === "Hook"
        ? `STRUCTURE (Hook/Relationship style, use for long-term roles or when a contact name/company is given):
      - Open with one reflective sentence connecting personally to this specific role or what it represents. Tie it to something concrete in the job post, not a generic statement.
      - Then a credibility paragraph: relevant platforms/industries plus day-to-day tasks.
      - Then a paragraph on what you personally enjoy about this kind of work, backed by a concrete example.
      - Then a paragraph on process/collaboration (workflow, tools, how you report issues or work with a team).
      - If the post signals an ongoing or long-term engagement, add a short paragraph framing interest in becoming a long-term part of the team.
      - Close by offering to discuss how you can contribute to the company, naming it if known.`
        : style === "Direct"
        ? `STRUCTURE (Direct/Standard style, use for one-off jobs or short gigs):
      - Simple greeting, no fluff.
      - Para 1 — Experience statement: name specific tools/products relevant to your background and what you focus on.
      - Para 2 — Direct tie-in to their specific project or need mentioned in the job post.
      - Para 3 — Process/methodology: how you actually work (bug reporting format, retest workflow, etc.), concrete not generic.
      - Para 4 — One-liner reinforcing traits (detail oriented, structured, clear communication).
      - Close: a short forward-looking line, e.g. "Looking forward to contributing to your project."`
        : style === "Concise"
        ? `STRUCTURE (Concise style, a tight ~100 word proposal in this exact pattern):
      - Hard limit applies to the MAIN proposal only (greeting through the closing): aim for about 100 words, never more than 120. Every line earns its place.
      - If the job post has screening questions, the "Answers to your questions:" section is SEPARATE and does NOT count toward the ~100 words. Never fold the answers into the main proposal to stay under the limit; keep the main proposal ~100 words and answer the questions below it.
      - Greeting: a simple "Dear [client's name if it appears in the job post, otherwise 'Client']," on its own line. No fluff.
      - Line 1 — Experience statement: name the specific tools/products from the profile and what you focus on.
      - Line 2 — Direct tie-in to their specific project or need from the job post.
      - Line 3 — Process/methodology: how you actually work (e.g. bug reporting format, retest workflow), concrete not generic.
      - Line 4 — One short line reinforcing traits (detail oriented, structured, clear communication).
      - Closing: exactly "Looking forward to contributing to your project." then "Regards," on the next line, followed by the freelancer's name if it can be told from the profile.
      - This fixed closing REPLACES the "end with a question" rule for this style. Do not end with a question.
      - Keep it as short lines/sentences following the order above, not one dense block.`
        : "";

      const lengthInstruction = isShort
        ? "Keep the proposal short: 3-4 short paragraphs max, no filler, only the strongest points. Cut anything that doesn't directly help win this job."
        : "";

      const prompt = `You are an expert freelance copywriter crafting a winning Upwork proposal.

      INSTRUCTIONS:
      ${toneInstruction}
      ${styleInstruction}
      ${humanizationInstruction}
      ${lengthInstruction}
      Keep the proposal structured and focused on the client's needs. Do not use generic greetings like "Dear Hiring Manager".
      If the JOB POST below contains screening questions, write the main proposal first, then add a clearly separate section after it titled "Answers to your questions:" and answer each question there, one by one, in the same order they were asked. Do not skip any question. Do not mix question answers into the main proposal paragraphs.

      ${profile
        ? `USER PROFILE:
      Skills: ${profile.skills}
      Experience: ${profile.experience}
      Projects: ${profile.projects}
      Achievements: ${profile.achievements}`
        : `No profile was provided. Write a strong, tailored proposal based only on what the JOB POST asks for. Do not invent specific company names, project names, or numbers, speak in general terms about relevant skills and approach instead.`}

      JOB POST:
      ${rawText}

      Reminder before you write: zero dashes (–/—), exactly one stat, zero "X but Y" constructions, plain paragraphs only. These rules are mandatory, not optional.
      ${style === "Concise" ? 'Concise style override: the MAIN proposal is about 100 words (greeting + 4 short lines + fixed closing), ending with "Looking forward to contributing to your project." then "Regards," and the name. Do NOT end with a question. Any screening-question answers go in a separate "Answers to your questions:" section below and are NOT counted in the ~100 words.' : ""}
      Write the cover letter / proposal text.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.4 }
      });
      
      generatedContent = response.text.replace(/[–—]/g, ",");
    }

    const proposal = await prisma.proposal.create({
      data: {
        jobId: jobPost.id,
        mode,
        style: style || "None",
        content: generatedContent,
      }
    });

    return new Response(JSON.stringify({ proposal }), { status: 200 });

  } catch (error) {
    console.error("Generate API Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { id, editedContent } = await req.json();
    const proposal = await prisma.proposal.update({
      where: { id },
      data: { isEdited: true, editedContent }
    });
    return new Response(JSON.stringify({ success: true, proposal }), { status: 200 });
  } catch (error) {
    console.error("Update Proposal Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
