const generateBtn = document.getElementById("generateBtn");
const resultsContainer = document.getElementById("resultsContainer");
const textInput = document.getElementById("inputText");
const toneSelect = document.getElementById("toneSelect");
const imageUpload = document.getElementById("imageUpload");

// Loading animation
function showLoading() {
    resultsContainer.innerHTML = `
        <div class="loading">
            <p>Generating content...</p>
        </div>
    `;
}

function hideLoading() {
    const loading = document.querySelector(".loading");
    if (loading) loading.remove();
}

function getSelectedPlatforms() {
    return [...document.querySelectorAll(".platforms input:checked")].map(cb => cb.value);
}

async function convertImagesToBase64(files) {
    const base64Images = [];

    for (let file of files) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result.split(",")[1]);
            reader.readAsDataURL(file);
        });

        base64Images.push({
            mimeType: file.type,
            data: base64
        });
    }

    return base64Images;
}

async function generatePostWithGemini(text, tone, platforms, imagesBase64) {
    const API_KEY = "AIzaSyDaltiF57k00oMSX9ZztZrV1WO0BmWmGnk";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const prompt = `
    Your ONLY task is to output a STRICT JSON object. 
    No commentary, no notes, no markdown, no code blocks.

    If the response is not valid JSON, you have failed.

    JSON REQUIRED FORMAT:
    {
      "summary": "string",
      "twitter": "string",
      "instagram": "string",
      "linkedin": "string",
      "tiktok": "string"
    }

    Rules:
    - Do NOT wrap the JSON in backticks.
    - Do NOT add extra keys.
    - Do NOT include explanations.
    - Do NOT include emojis.
    - Platform fields should contain platform-specific rewritten content.
    - If a platform was not selected, make the value an empty string "".
    
    Now rewrite the user's content accordingly.
    `;


    const contents = [
        {
            role: "user",
            parts: [
                { text },
                { text: prompt }
            ]
        }
    ];

    imagesBase64.forEach(img => {
        contents[0].parts.push({
            inlineData: {
                mimeType: img.mimeType,
                data: img.data
            }
        });
    });

    const body = { contents };

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let json;
    try {
        json = extractJSON(rawText);
;
    } catch (err) {
        throw new Error("Gemini did not return valid JSON. Response: " + rawText);
    }

    return json;
}

function displayResults(results) {
    resultsContainer.innerHTML = "";

    if (results.summary) createResultCard("Summary", results.summary);
    if (results.twitter) createResultCard("Twitter / X", results.twitter);
    if (results.instagram) createResultCard("Instagram", results.instagram);
    if (results.linkedin) createResultCard("LinkedIn", results.linkedin);
    if (results.tiktok) createResultCard("TikTok", results.tiktok);
}

function createResultCard(title, content) {
    const card = document.createElement("div");
    card.className = "result-card";

    card.innerHTML = `
        <h3>${title}</h3>
        <p>${content}</p>
        <button class="copy-btn">Copy</button>
    `;

    card.querySelector(".copy-btn").addEventListener("click", () => {
        navigator.clipboard.writeText(content);
        card.querySelector(".copy-btn").innerText = "Copied!";
        setTimeout(() => {
            card.querySelector(".copy-btn").innerText = "Copy";
        }, 1200);
    });

    resultsContainer.appendChild(card);
}

generateBtn.addEventListener("click", async () => {
    resultsContainer.innerHTML = "";
    showLoading();

    const platforms = getSelectedPlatforms();
    const text = textInput.value.trim();
    const tone = toneSelect.value;

    if (!text && imageUpload.files.length === 0) {
        alert("Please enter text or upload at least one image.");
        hideLoading();
        return;
    }

    const imagesBase64 = await convertImagesToBase64(imageUpload.files);

    try {
        const aiResponse = await generatePostWithGemini(text, tone, platforms, imagesBase64);
        hideLoading();
        displayResults(aiResponse);
    } catch (err) {
        console.error(err);
        hideLoading();
        resultsContainer.innerHTML = `<p style="color:#ff8080;">Error: ${err.message}</p>`;
    }
});
function extractJSON(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in AI response.");
    return JSON.parse(match[0]);
}
