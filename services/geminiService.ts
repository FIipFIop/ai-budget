import { GoogleGenAI, Type } from "@google/genai";
import type { Expense } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function getEstimatedNetIncome(
    grossMonthlyIncome: number,
    location: string,
    filingStatus: string
): Promise<{ netIncome: number; totalTax: number; disclaimer: string }> {
     const prompt = `Act as a tax calculator. Based on the user's details, estimate their monthly net income.
        - Gross Monthly Income: $${grossMonthlyIncome}
        - Location: "${location}" (Consider US federal, state, and any applicable local/city taxes)
        - Tax Filing Status: "${filingStatus}"
        
        Use standard deductions for your calculation. Provide the result as a JSON object. The JSON object should contain 'estimatedNetIncome' (number), 'estimatedTotalTax' (number), and a brief one-sentence 'disclaimer' stating that this is an estimate for informational purposes only and not financial advice.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        estimatedNetIncome: { type: Type.NUMBER, description: "The estimated monthly income after all taxes." },
                        estimatedTotalTax: { type: Type.NUMBER, description: "The total estimated monthly tax amount." },
                        disclaimer: { type: Type.STRING, description: "A brief disclaimer." }
                    },
                    required: ["estimatedNetIncome", "estimatedTotalTax", "disclaimer"]
                }
            }
        });

        const result = JSON.parse(response.text);
        return {
            netIncome: result.estimatedNetIncome,
            totalTax: result.estimatedTotalTax,
            disclaimer: result.disclaimer,
        };
    } catch (error) {
        console.error("Error calling Gemini API for tax estimation:", error);
        throw new Error("Failed to generate tax estimation from AI.");
    }
}


export async function getBudgetAnalysis(
    grossIncome: number,
    netIncome: number,
    location: string,
    expenses: Expense[],
    totalExpenses: number,
    remainingBalance: number
): Promise<string> {
    const expenseList = expenses
        .map(e => `- ${e.name}: $${parseFloat(e.amount).toFixed(2)}`)
        .join('\n');

    const prompt = `
You are a friendly and insightful financial assistant. A user has provided their monthly budget information. Your task is to provide a brief, encouraging, and helpful analysis of their budget.

**User's Financial Details:**
- **Location:** ${location}
- **Gross Monthly Income:** $${grossIncome.toFixed(2)}
- **Estimated Net Monthly Income (After Tax):** $${netIncome.toFixed(2)}
- **Monthly Expenses:**
${expenseList}
- **Total Monthly Expenses:** $${totalExpenses.toFixed(2)}
- **Remaining Balance:** $${remainingBalance.toFixed(2)}

**Your Task:**
Based on this information, provide a short analysis (2-3 paragraphs). Follow these instructions:
1.  **Tone:** Be positive, encouraging, and non-judgmental, regardless of the remaining balance.
2.  **Analysis:** Briefly comment on their financial situation. If the balance is positive, congratulate them. If it's negative, be reassuring and focus on actionable steps.
3.  **Actionable Tip:** Provide one or two simple, actionable tips relevant to their situation. For example, if they have a positive balance, suggest a savings or investment goal. If it's negative, suggest a common area where people can cut back. The location might influence the tips (e.g., high cost of living area).
4.  **Format:** Write in clear, easy-to-understand language. Do not use markdown like headers or bold text.

Speak directly to the user.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for budget analysis:", error);
        throw new Error("Failed to generate budget analysis from AI.");
    }
}
