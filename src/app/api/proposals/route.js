import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const proposals = await prisma.proposal.findMany({
      orderBy: { createdAt: 'desc' },
      include: { job: true }
    });
    return new Response(JSON.stringify({ proposals }), { status: 200 });
  } catch (error) {
    console.error("Proposals API Error (GET):", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const { id, isSaved } = await req.json();
    
    if (!id || typeof isSaved !== 'boolean') {
      return new Response(JSON.stringify({ error: "ID and isSaved boolean are required" }), { status: 400 });
    }

    const proposal = await prisma.proposal.update({
      where: { id },
      data: { isSaved }
    });

    return new Response(JSON.stringify({ success: true, proposal }), { status: 200 });
  } catch (error) {
    console.error("Proposals API Error (PATCH):", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return new Response(JSON.stringify({ error: "Proposal ID required" }), { status: 400 });
    }

    await prisma.proposal.delete({
      where: { id }
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Proposals API Error (DELETE):", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
