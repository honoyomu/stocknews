import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("Edge function 'process-news-with-gemini' is setting up.");

serve(async (req: Request)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
      }
    });
  }

  try {
    // Get Gemini API Key from environment variables
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY environment variable not set.");
      return new Response(JSON.stringify({
        error: "Server configuration error: API key missing."
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    // Parse request body for articles
    // Explicitly type articles if possible, or use `any` if structure is too variable initially
    const { articles }: { articles: any[] } = await req.json(); // Added type for articles

    if (!Array.isArray(articles) || articles.length === 0) {
      return new Response(JSON.stringify({
        error: "Invalid input: 'articles' must be a non-empty array."
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    console.log(`[Edge Function] Received ${articles.length} articles for analysis.`);

    const analysisPromises = articles.map(async (article)=>{
      const promptText = `
        Analyze the following financial news article for a stock.
        Provide:
        1. The overall financial sentiment category ("bullish", "bearish", "neutral-impact", "mixed").
        2. A numeric sentiment score between -1.0 (very bearish) and 1.0 (very bullish).
        3. The relevance of the news to potential stock price changes ("high", "medium", "low").
        4. A brief justification for your analysis.
        5. A list of any explicitly mentioned company names or stock tickers (e.g., ["AAPL", "Microsoft Corp"]).
        6. Your confidence in this analysis ("high", "medium", "low").

        News Headline: "${article.headline}"
        News Summary: "${article.summary}"

        Respond ONLY with a valid JSON object in the following format:
        {
          "financialSentimentCategory": "bullish" | "bearish" | "neutral-impact" | "mixed",
          "sentimentScoreNumeric": number, // A float between -1.0 and 1.0
          "relevanceToPrice": "high" | "medium" | "low",
          "justification": "Your brief reasoning here (1-2 sentences).",
          "mentionedEntities": ["string"], // List of company names or stock tickers
          "analysisConfidence": "high" | "medium" | "low"
        }
      `;

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: promptText
              }
            ]
          }
        ]
      };
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

      // Define types for the expected LLM response structure
      interface LLMAnalysisResult {
        financialSentimentCategory?: "bullish" | "bearish" | "neutral-impact" | "mixed";
        sentimentScoreNumeric?: number;
        relevanceToPrice?: "high" | "medium" | "low";
        justification?: string;
        mentionedEntities?: string[];
        analysisConfidence?: "high" | "medium" | "low";
      }

      let analysisResultFromLLM: LLMAnalysisResult = {};
      let sentimentScore = 0.0;
      let mentionedEntities: string[] = [];
      let analysisConfidence: "high" | "medium" | "low" = "low";

      try {
        console.log(`[Edge Function] Article ID ${article.id}: Preparing to send to Gemini for analysis. Headline: "${article.headline}"`);
        const geminiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });

        if (!geminiResponse.ok) {
          const errorBody = await geminiResponse.text();
          console.error(`[Edge Function] Gemini API request failed for article ID ${article.id}. Status: ${geminiResponse.status}. Body: ${errorBody}`);
          throw new Error(`Gemini API request failed with status ${geminiResponse.status}.`);
        }

        const responseData = await geminiResponse.json();
        const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText || typeof rawText !== 'string') {
          console.error(`[Edge Function] Could not extract text from Gemini response for article ID ${article.id}. Response data:`, responseData);
          throw new Error("Could not extract text from Gemini response.");
        }
        console.log(`[Edge Function] Raw text from Gemini for article ID ${article.id}:`, rawText);

        // Robust cleaning of the raw text to extract JSON
        let cleanedText = rawText.replace(/^```(?:json)?\\s*/, "");
        cleanedText = cleanedText.replace(/\\s*```\\s*$/, "");
        cleanedText = cleanedText.trim();
        console.log(`[Edge Function] Cleaned text for parsing for article ID ${article.id}:`, cleanedText);

        analysisResultFromLLM = JSON.parse(cleanedText) as LLMAnalysisResult;
        console.log(`[Edge Function] Article ID ${article.id}: Successfully parsed sentiment from Gemini. Category: ${analysisResultFromLLM.financialSentimentCategory}, Score: ${analysisResultFromLLM.sentimentScoreNumeric}, Relevance: ${analysisResultFromLLM.relevanceToPrice}, Entities: ${JSON.stringify(analysisResultFromLLM.mentionedEntities)}, Confidence: ${analysisResultFromLLM.analysisConfidence}`);

        // Validate and get the numeric sentiment score
        if (typeof analysisResultFromLLM.sentimentScoreNumeric === 'number' &&
            analysisResultFromLLM.sentimentScoreNumeric >= -1.0 &&
            analysisResultFromLLM.sentimentScoreNumeric <= 1.0) {
          sentimentScore = analysisResultFromLLM.sentimentScoreNumeric;
        } else {
          console.warn(`[Edge Function] Invalid or missing sentimentScoreNumeric for article ID ${article.id}. Defaulting to 0.0. Received:`, analysisResultFromLLM.sentimentScoreNumeric);
          sentimentScore = 0.0;
        }

        // Extract and validate mentioned entities
        if (Array.isArray(analysisResultFromLLM.mentionedEntities)) {
          mentionedEntities = analysisResultFromLLM.mentionedEntities.filter(e => typeof e === 'string');
        } else if (analysisResultFromLLM.mentionedEntities !== undefined) {
          console.warn(`[Edge Function] Invalid mentionedEntities for article ID ${article.id}. Defaulting to []. Received:`, analysisResultFromLLM.mentionedEntities);
        }

        // Extract and validate analysis confidence
        const conf = analysisResultFromLLM.analysisConfidence?.toLowerCase();
        if (conf === "high" || conf === "medium" || conf === "low") {
          analysisConfidence = conf;
        } else if (analysisResultFromLLM.analysisConfidence !== undefined) {
           console.warn(`[Edge Function] Invalid analysisConfidence for article ID ${article.id}. Defaulting to 'low'. Received:`, analysisResultFromLLM.analysisConfidence);
        }

      } catch (e: any) { // Explicitly type error as any
        console.error(`[Edge Function] Error during Gemini call or parsing for article ID ${article.id}:`, e.message, e.stack);
        analysisResultFromLLM = { // Default values on error
          financialSentimentCategory: "neutral-impact",
          relevanceToPrice: "low",
          justification: `Error analyzing article: ${e.message.substring(0, 150)}`
        };
        sentimentScore = 0.0;
        mentionedEntities = [];
        analysisConfidence = "low";
      }

      return {
        id: article.id,
        title: article.headline,
        summary: article.summary,
        url: article.url,
        source: article.source,
        publishedAt: article.publishedAt,
        financialSentimentCategory: analysisResultFromLLM.financialSentimentCategory || "neutral-impact",
        relevanceToPrice: analysisResultFromLLM.relevanceToPrice || "low",
        justification: analysisResultFromLLM.justification || "Error processing analysis.",
        sentimentScore: sentimentScore,
        mentionedEntities: mentionedEntities,
        analysisConfidence: analysisConfidence
      };
    });

    const analyzedResults = await Promise.all(analysisPromises);

    return new Response(JSON.stringify(analyzedResults), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error: any) { // Explicitly type error as any
    console.error("[Edge Function] Unhandled error in Edge Function:", error.message, error.stack);
    return new Response(JSON.stringify({
      error: error.message || "An unexpected error occurred."
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}); 