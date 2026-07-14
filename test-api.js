async function run() {
  try {
    console.log("1. Creating dummy profile...");
    const profileRes = await fetch('http://127.0.0.1:3001/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: 'I am a highly skilled React developer with 5 years of experience.' })
    });
    const profileData = await profileRes.json();
    console.log("Profile Created:", profileData.success ? "Success" : profileData);

    console.log("\n2. Generating mock proposal...");
    const generateRes = await fetch('http://127.0.0.1:3001/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: 'I need a frontend dev to build my app', mode: 'Honest' })
    });
    const generateData = await generateRes.json();
    
    if (generateData.proposal) {
        console.log("Proposal Generated successfully!");
        console.log("Proposal Content:", generateData.proposal.content);
    } else {
        console.log("Failed to generate:", generateData);
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}
run();
