import type { Handler } from "@netlify/functions";

const SYSTEM_PROMPT = `You are the Stylist Engine for AI Vogue — a precision fashion intelligence system trained on decades of editorial theory, runway science, and real-world wearability.

You receive structured garment data (garment_dna) extracted by computer vision. Your job is to process this data like a RUTHLESS, highly critical senior fashion editor: analytically rigorous, aesthetically opinionated, and always grounded in the wearer's real context.

CRITICAL GRADING INSTRUCTION: DO NOT BE POLITE. DO NOT DEFAULT TO HIGH SCORES. Use the full 0-100 scale.
- 90-100: Absolute perfection. Rare and flawless.
- 75-89: Good to great, but with minor proportional or color flaws.
- 50-74: Mediocre, boring, slightly disjointed, or "safe but uninspired."
- 0-49: Terrible, explicitly clashing colors (e.g. bright green paired with a patterned polo), extreme formality mismatches, or chaotic patterns. Be brutal in your critique.

═══════════════════════════════════════
CORE FASHION THEORY MODULES (Always Active)
═══════════════════════════════════════

[MODULE 1 — COLOR HARMONY ENGINE]
Apply these color relationship systems to every outfit evaluation:

• ANALOGOUS HARMONY: Colors within 30° of each other on the color wheel (e.g., navy + cobalt + slate) — safe, cohesive, subtle. Best for formal and professional contexts.
• COMPLEMENTARY CONTRAST: Colors 180° apart (e.g., navy + warm amber) — high energy, visually striking. Best for social and editorial contexts.
• TRIADIC BALANCE: Three equidistant hues — bold, requires one dominant + two accents. Use sparingly.
• TONAL DRESSING (MONOCHROME): Same hue family in varying lightness/saturation — sophisticated, elongating. Award high harmony scores.
• NEUTRAL ANCHORING: One neutral (black, white, grey, tan, navy, camel) paired with one accent color — the most universally wearable formula. Always acknowledge this pattern.
• VALUE CONTRAST LAW: Light-on-dark or dark-on-light creates structure. Muddled mid-tone combos lack definition — penalize accordingly.
• SKIN TONE CONSIDERATION: When skin_tone_hex is provided, evaluate whether the outfit's dominant colors fall in warm (yellow/orange/red undertones) or cool (blue/pink/purple undertones) territory relative to the wearer. Warm skin tones are flattered by warm colors and earth tones. Cool skin tones are flattered by jewel tones and cooler neutrals.

[MODULE 2 — FORMALITY BRIDGE THEORY]
Every garment carries a formality_index (1–10 scale). Outfit scoring must evaluate the "formality gap":

• MATCHED FORMALITY (gap 0–1): Cohesive, intentional. Always scores well.
• SMART CASUAL BRIDGE (gap 2–3): The most commercially successful dressing formula. A deliberate elevation of casual with one formal anchor. Recognize and reward this intentionally.
• HIGH-LOW DRESSING (gap 4–5): Fashion-forward. Works when at least one item is designer-tier in quality signals. Flag as editorial rather than everyday.
• FORMALITY CLASH (gap 6+): Almost always a mismatch unless a very specific context (e.g., "deconstructed formal" for editorial shoots). Flag clearly.
• CONTEXT OVERRIDE: Always read formality against the event_context. A 4/10 formality outfit at a Beach Party is perfect. The same outfit at a Black Tie Gala is a critical mismatch.

[MODULE 3 — FIT GEOMETRY SYSTEM]
Body build interacts with garment fit to create visual proportion. Apply these rules:

• SLIM FIT on Athletic V Build: Excellent — accentuates shoulder-to-waist ratio.
• SLIM FIT on Lean/Petite Build: Good — elongates silhouette.
• RELAXED FIT on Athletic V Build: Can mask proportions; only works with deliberate oversized styling.
• REGULAR FIT: Universal. Safe. Score neutrally unless combined with other strong visual elements.
• SILHOUETTE RULE: Aim for contrast — if top is voluminous, bottom should be slim, and vice versa. Matching volume at top and bottom creates a boxy look unless intentional (e.g., oversized streetwear).
• PROPORTION ANCHORING: One fitted element per outfit is always recommended.

[MODULE 4 — PATTERN COLLISION RULES]
• TWO PATTERNS: Can work only if they differ radically in scale (micro-print + macro-check) OR share a strong common color. Otherwise penalize.
• PATTERN + SOLID: The default and safest formula. Always award base synergy points.
• TEXTURE CONTRAST: Even when colors and patterns match, contrasting textures (e.g., matte cotton + sheen satin) add dimensionality. Reward this.
• STRIPE DIRECTION: Vertical stripes are slimming and elongating. Horizontal stripes add visual width. Flag these effects contextually.

[MODULE 5 — EVENT CONTEXT INTELLIGENCE]
Map event contexts to expected outfit parameters:

| Event Context        | Formality Target | Key Style Signal         |
|----------------------|------------------|--------------------------|
| Business Meeting     | 7–9              | Structured, neutral palette |
| Social Cafe          | 4–6              | Smart casual, conversational |
| Date Night           | 5–8              | Polished, intentional color |
| Beach / Outdoor      | 1–3              | Breathable, casual, light palette |
| Formal Gala / Event  | 8–10             | Elevated, monochrome or classic |
| Gym / Active         | 1–2              | Functional, performance-first |
| Creative Office      | 4–7              | Expressive, personality-forward |
| Party / Club         | 5–8              | Bold color, strong silhouette |
| Travel               | 2–5              | Comfort-first, neutral palette |
| Wedding Guest        | 6–9              | Occasion-aware, avoid white/black |

Always cross-reference the user's outfit formality against the event target.

═══════════════════════════════════════
OUTPUT RULES
═══════════════════════════════════════

1. ALWAYS respond with ONLY valid JSON. No markdown, no preamble, no explanation outside the JSON.
2. Match the exact schema specified for the task in the user message.
3. All scores are integers from 0–100.
4. editorial_feedback must be 2–4 sentences. Write like a sharp, intelligent fashion editor — specific, not vague. Reference actual garment properties (colors, patterns, fits) in your feedback.
5. quick_tips must be actionable, specific, and reference actual items or properties in the outfit.
6. Never hallucinate garment properties not present in the provided garment_dna.
7. When skin_tone_hex or build_type is provided, personalize the output — this is not optional.
`;

function normalizeResponse(task: string, parsedData: any): any {
  if (!parsedData) return parsedData;

  if (task === "detect_garment") {
    return {
      status: parsedData.status || "success",
      detected_category: parsedData.detected_category || parsedData.category || "Topwear",
      detected_color_hex: parsedData.detected_color_hex || parsedData.color_hex || parsedData.color || "#1a1a1a",
      confidence: typeof parsedData.confidence === "number" ? parsedData.confidence : 0.9,
    };
  }

  if (task === "detect_skin_tone") {
    return {
      status: parsedData.status || "success",
      skin_tone_hex: parsedData.skin_tone_hex || parsedData.color_hex || "#e8e0d4",
      confidence: typeof parsedData.confidence === "number" ? parsedData.confidence : 0.9,
    };
  }

  if (task === "suggest_outfit") {
    return {
      status: parsedData.status || "success",
      suggested_bottom_id: parsedData.suggested_bottom_id !== undefined ? parsedData.suggested_bottom_id : (parsedData.bottom_id || null),
      suggested_footwear_id: parsedData.suggested_footwear_id !== undefined ? parsedData.suggested_footwear_id : (parsedData.footwear_id || null),
      confidence_score: parsedData.confidence_score !== undefined ? parsedData.confidence_score : 80,
      error: parsedData.error || null,
    };
  }

  if (task === "analyze_synergy") {
    return {
      status: parsedData.status || "success",
      synergy_score: {
        total: parsedData.synergy_score?.total || 80,
        color_harmony: parsedData.synergy_score?.color_harmony || 80,
        formality_match: parsedData.synergy_score?.formality_match || 80,
        pattern_balance: parsedData.synergy_score?.pattern_balance || 80,
        context_fit: parsedData.synergy_score?.context_fit || 80,
        build_alignment: parsedData.synergy_score?.build_alignment || 80
      },
      score_verdict: parsedData.score_verdict || "Decent Combo",
      color_analysis: parsedData.color_analysis || "The colors work well together.",
      formality_analysis: parsedData.formality_analysis || "The formality matches the event.",
      editorial_feedback: parsedData.editorial_feedback || "The outfit displays a good sense of harmony and fits the event appropriately.",
      quick_tips: Array.isArray(parsedData.quick_tips) ? parsedData.quick_tips : [],
      styling_verdict: parsedData.styling_verdict || "A cohesive look.",
      error: parsedData.error || null,
    };
  }

  return parsedData;
}

// ─────────────────────────────────────────────────────────────────────────────
// DNA Context Formatter
// Converts a garment_dna object into a rich text block for Groq.
// This is the bridge between the Python pipeline output and Groq's text input.
// ─────────────────────────────────────────────────────────────────────────────

function formatDNAContext(label: string, dna: any): string {
  if (!dna) return "";

  const vt = dna.visual_traits || {};
  const pt = dna.physical_traits || {};
  const st = dna.style_traits || {};
  const uo = dna.user_overrides || {};

  const material = uo.material || pt.material || "Unknown";
  const fit = uo.fit || pt.fit || "Unknown";
  const formalityIndex = uo.formality_index ?? st.formality_index ?? "Unknown";

  return `
${label} — GARMENT PROFILE (Extracted Visual DNA):
  Category:     ${dna.category || "Unknown"}
  Colors:       ${vt.dominant_color_name || "Unknown"}${vt.secondary_color_name ? " with " + vt.secondary_color_name : ""}
  Hex:          ${vt.dominant_color_hex || "N/A"}${vt.secondary_color_hex ? " / " + vt.secondary_color_hex : ""}
  Pattern:      ${vt.pattern || "Unknown"} (confidence: ${vt.pattern_confidence ?? "N/A"})
  Neckline:     ${pt.neckline || "Unknown"}
  Sleeve:       ${pt.sleeve_length || "N/A"}
  Length:       ${pt.garment_length || "N/A"}
  Material:     ${material}
  Fit:          ${fit}
  Season:       ${pt.season || "All-Season"}
  Formality:    ${formalityIndex}/10
  Style:        ${st.style_archetype || "Unknown"}
  Summary:      ${dna.final_summary || "No summary available"}
`.trim();
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const body = JSON.parse(event.body ?? "{}");
    const { task, ...payload } = body;

    // Strip giant base64 images so we don't blow up the LLM context limit (causes 413 error)
    delete payload.image_base64;
    delete payload.image;

    // 1. Build a rich text prompt for Groq using Garment DNA context
    // Instead of sending raw JSON blobs, we format each garment as a
    // human-readable "GARMENT PROFILE" block that Groq can reason over naturally.

    let promptText = `TASK: ${task}\n\n`;

    if (task === "detect_garment") {
      // detect_garment: the DNA pipeline has already run — use garment_dna directly
      // if present, otherwise fall back to a basic "no visual data" note.
      if (payload.garment_dna) {
        promptText += formatDNAContext("GARMENT", payload.garment_dna) + "\n\n";
        promptText += `Using the Garment DNA above, respond with the detect_garment JSON schema. `;
        promptText += `Use dominant_color_hex for detected_color_hex. Confidence should be 0.95 since DNA is authoritative.\n`;
      } else {
        promptText += `No garment DNA available (image was uploaded without running the local pipeline).\n`;
        promptText += `Task payload: ${JSON.stringify(payload)}\n`;
        promptText += `Make a best-effort guess using any available metadata. Set confidence to 0.5.\n`;
      }
      promptText += `Respond exactly with this JSON schema: {"status":"success"|"error","detected_category":"Topwear"|"Bottomwear"|"Footwear"|"Outerwear","detected_color_hex":"#HEX","confidence":0.0}`;

    } else if (task === "detect_skin_tone") {
      // detect_skin_tone: still image-based — pass through as-is
      promptText += `Task payload: ${JSON.stringify(payload)}\n`;
      promptText += `Respond exactly with this JSON schema: {"status":"success"|"error","skin_tone_hex":"#HEX","confidence":0.0}`;

    } else if (task === "suggest_outfit") {
      // suggest_outfit: format the locked item and full inventory with DNA context
      const { locked_item, inventory } = payload;

      if (locked_item) {
        promptText += formatDNAContext("LOCKED ITEM (Anchor Piece)", locked_item.garment_dna) || 
          `LOCKED ITEM: category=${locked_item.category}, color=${locked_item.colorHex}, tags=${(locked_item.tags || []).join(", ")}`;
        promptText += "\n\n";
      }

      if (inventory && inventory.length > 0) {
        promptText += `WARDROBE INVENTORY (${inventory.length} items):\n`;
        inventory.forEach((item: any, i: number) => {
          const label = `Item #${item.id} (${item.category})`;
          if (item.garment_dna) {
            promptText += "\n" + formatDNAContext(label, item.garment_dna) + "\n";
          } else {
            promptText += `\n${label}: color=${item.colorHex}, tags=${(item.tags || []).join(", ")}\n`;
          }
        });
      }

      promptText += `\nSelect the best bottom and footwear from the inventory to pair with the locked item. `;
      promptText += `Consider color harmony, formality match, and style archetype compatibility. `;
      promptText += `Respond exactly with this JSON schema: {"status":"success"|"failure","suggested_bottom_id":null,"suggested_footwear_id":null,"confidence_score":0,"error":null}`;

    } else if (task === "analyze_synergy") {
      // analyze_synergy: format all three outfit pieces with DNA context
      const { outfit, user_profile, event_context } = payload;

      promptText = `TASK: analyze_synergy\n\n`;
      promptText += `EVENT CONTEXT: ${event_context || "Not specified"}\n\n`;

      if (user_profile) {
        promptText += `USER PROFILE:\n`;
        promptText += `  Skin Tone: ${user_profile.skin_tone_hex || "Unknown"}\n`;
        promptText += `  Build Type: ${user_profile.build_type || "Unknown"}\n\n`;
      }

      if (outfit?.top) {
        promptText += formatDNAContext("TOP", outfit.top.garment_dna) ||
          `TOP: category=${outfit.top.category}, color=${outfit.top.colorHex}`;
        promptText += "\n\n";
      }
      if (outfit?.bottom) {
        promptText += formatDNAContext("BOTTOM", outfit.bottom.garment_dna) ||
          `BOTTOM: category=${outfit.bottom.category}, color=${outfit.bottom.colorHex}`;
        promptText += "\n\n";
      }
      if (outfit?.footwear) {
        promptText += formatDNAContext("FOOTWEAR", outfit.footwear.garment_dna) ||
          `FOOTWEAR: category=${outfit.footwear.category}, color=${outfit.footwear.colorHex}`;
        promptText += "\n\n";
      }

      promptText += `Analyze this outfit for synergy. Apply color harmony theory, formality bridge theory, fit geometry, and pattern rules from your core modules. Factor in the event context and user profile.\n`;
      promptText += `Respond ONLY with this exact JSON schema:
{
  "status": "success",
  "synergy_score": {
    "total": <0-100 integer>,
    "color_harmony": <0-100 integer>,
    "formality_match": <0-100 integer>,
    "pattern_balance": <0-100 integer>,
    "context_fit": <0-100 integer>,
    "build_alignment": <0-100 integer>
  },
  "score_verdict": "<Excellent Match | Strong Match | Decent Combo | Needs Work | Critical Mismatch>",
  "color_analysis": "<1-2 sentences: name the exact color relationship at play (analogous, complementary, tonal, etc.) and whether it works>",
  "formality_analysis": "<1 sentence: state the formality gap and its implication for the event context>",
  "editorial_feedback": "<2-4 sentences: sharp, specific, editor-voice feedback referencing real garment details>",
  "quick_tips": [
    "<Specific actionable tip 1>",
    "<Specific actionable tip 2>",
    "<Specific actionable tip 3>"
  ],
  "styling_verdict": "<One punchy editorial line summarizing the outfit — like a magazine caption>"
}`;

    } else {
      // Fallback for any unknown task
      promptText += `Task payload: ${JSON.stringify(payload)}`;
    }

    const userMessageContent: any[] = [{ type: "text", text: promptText }];

    const model = "llama-3.1-8b-instant";

    // Note: Groq has decommissioned vision models. The Garment DNA pipeline
    // provides all visual context via text, making image inputs unnecessary.

    // 2. Call Groq API
    const API_KEY = process.env.GROQ_API_KEY;
    const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessageContent }
        ],
        temperature: 0.4,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Groq response path is data.choices[0].message.content
    const rawText = data.choices?.[0]?.message?.content ?? "{}";
    const parsedText = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    const normalized = normalizeResponse(task, parsedText);
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    };
  } catch (error: any) {
    console.error("Stylist Engine Error:", error);
    return {
      statusCode: 502,
      body: JSON.stringify({ status: "error", error_message: error.message }),
    };
  }
};