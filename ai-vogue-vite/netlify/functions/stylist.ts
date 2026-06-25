import type { Handler } from "@netlify/functions";

// Lean system prompt — condensed to stay under Groq free-tier token limits.
const SYSTEM_PROMPT = `You are the Stylist Engine for AI Vogue, a digital-wardrobe app. You are a senior fashion stylist and colorist. Output ONLY valid JSON — no markdown, no prose, no preamble.

GLOBAL RULES:
1. ONE valid JSON object. Nothing before or after it. Every required key must be present, even if null.
2. confidence fields: floats 0.0-1.0. Synergy/score fields: integers 0-100.
3. skin_tone_hex, measurements, calculated_shape, build_type are permanent profile facts. Never revise them except in their own detection tasks.
4. Never refuse. Always produce a best-effort response.

COLOR EXPERTISE:
- Use complementary, analogous, monochrome, neutral-anchored harmony theory.
- Warm skin undertone: gold metals, warm palette (rust, olive, mustard, coral).
- Cool skin undertone: silver metals, cool palette (blue, lavender, burgundy, emerald).
- 60-30-10 rule for color balance across an outfit.

BODY PROPORTION:
- Inverted Triangle: add visual width below (wide-leg, A-line bottoms), avoid shoulder detail.
- Rectangle: add waist definition (belts, wrap tops, peplums).
- Athletic V: fitted/tailored silhouettes work well.
- Trapezoid: most versatile, let color theory lead.
- build_type (Slim/Athletic/Broad/Heavy) informs fit recs only.

EVENT FORMALITY (1-5 scale):
- Weekend/Casual: 1-2. Office: 3-4. Date Night: 3 (vibe-weighted). Formal/Wedding: 4-5.
- Infer formality from any custom event text (trek=1, brunch=2, interview=4, gala=5).

GARMENT DNA (when garment_dna is in the request):
- Authoritative ground truth extracted by computer vision. Do not contradict it.
- Use dominant_color_hex for color calculations (more accurate than colorHex).
- Use formality_index (1-10) to calibrate against event formality.
- Use final_summary as the primary garment description.
- material/fit may be null (user fills them) — do not invent values.

TASK SCHEMAS (respond with exactly this structure for the given task):
detect_garment: {"status":"success"|"error","detected_category":"Topwear"|"Bottomwear"|"Footwear"|"Outerwear","detected_color_hex":"#HEX","confidence":0.0}
detect_skin_tone: {"status":"success"|"error","skin_tone_hex":"#HEX","confidence":0.0}
suggest_outfit: {"status":"success"|"failure","suggested_bottom_id":null,"suggested_footwear_id":null,"confidence_score":0,"error":null}
analyze_synergy: {"status":"success"|"failure","synergy_score":{"total":0,"harmony":0,"vibe":0},"editorial_feedback":"single editorial paragraph","error":null}
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
    let synergyScore = parsedData.synergy_score;
    if (!synergyScore && parsedData.synergy_scores) {
      const scores = parsedData.synergy_scores;
      synergyScore = {
        total: scores.overall_synergy_score !== undefined ? scores.overall_synergy_score : scores.total,
        harmony: scores.color_synergy_score !== undefined ? scores.color_synergy_score : scores.harmony,
        vibe: scores.event_synergy_score !== undefined ? scores.event_synergy_score : scores.vibe,
      };
    }
    
    const total = synergyScore?.total !== undefined && synergyScore?.total !== null ? Number(synergyScore.total) : 80;
    const harmony = synergyScore?.harmony !== undefined && synergyScore?.harmony !== null ? Number(synergyScore.harmony) : 80;
    const vibe = synergyScore?.vibe !== undefined && synergyScore?.vibe !== null ? Number(synergyScore.vibe) : 80;

    let editorialFeedback = parsedData.editorial_feedback;
    if (editorialFeedback && typeof editorialFeedback === "object") {
      editorialFeedback = Object.values(editorialFeedback).filter(v => typeof v === "string").join(" ");
    }
    if (!editorialFeedback) {
      editorialFeedback = "The outfit displays a good sense of harmony and fits the event appropriately.";
    }

    return {
      status: parsedData.status || "success",
      synergy_score: { total, harmony, vibe },
      editorial_feedback: editorialFeedback,
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
        promptText += `Use dominant_color_hex for detected_color_hex. Confidence should be 0.95 since DNA is authoritative.`;
      } else {
        promptText += `No garment DNA available (image was uploaded without running the local pipeline).\n`;
        promptText += `Task payload: ${JSON.stringify(payload)}\n`;
        promptText += `Make a best-effort guess using any available metadata. Set confidence to 0.5.`;
      }

    } else if (task === "detect_skin_tone") {
      // detect_skin_tone: still image-based — pass through as-is
      promptText += `Task payload: ${JSON.stringify(payload)}`;

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
      promptText += `Respond with the suggest_outfit JSON schema.`;

    } else if (task === "analyze_synergy") {
      // analyze_synergy: format all three outfit pieces with DNA context
      const { outfit, user_profile, event_context } = payload;

      promptText += `EVENT CONTEXT: ${event_context || "Not specified"}\n\n`;

      if (user_profile) {
        promptText += `USER PROFILE:\n`;
        promptText += `  Skin Tone: ${user_profile.skin_tone_hex || "Unknown"}\n`;
        promptText += `  Build: ${user_profile.build_type || "Unknown"}\n`;
        promptText += `  Shape: ${user_profile.calculated_shape || "Unknown"}\n\n`;
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

      promptText += `Analyze the outfit above for synergy, color harmony, and event appropriateness. `;
      promptText += `Respond with the analyze_synergy JSON schema.`;

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
        ]
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