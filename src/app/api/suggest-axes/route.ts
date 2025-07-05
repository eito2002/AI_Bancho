import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ApiResponse, SuggestAxesRequest, SuggestedAxis } from '@/types';

// Gemini APIの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<SuggestedAxis[]>>> {
  try {
    const body: SuggestAxesRequest = await request.json();
    const { topicName, goal, existingAxes, transcript, ideas } = body;

    if (!topicName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Topic name is required',
        },
        { status: 400 }
      );
    }

    const suggestions = await generateAxisSuggestions(
      topicName,
      goal,
      existingAxes,
      transcript,
      ideas
    );

    return NextResponse.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Error generating axis suggestions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate suggestions',
      },
      { status: 500 }
    );
  }
}

async function generateAxisSuggestions(
  topicName: string,
  goal?: string,
  existingAxes: string[] = [],
  transcript?: string,
  ideas: Array<{ name: string; description?: string }> = []
): Promise<SuggestedAxis[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // プロンプトを構築
    const prompt = `
あなたは意思決定支援の専門家です。以下の情報を基に、議論の評価に適した新しい評価軸を3つ提案してください。

【議題名】: ${topicName}
${goal ? `【議論の目標】: ${goal}` : ''}

【既存の評価軸】:
${existingAxes.length > 0 ? existingAxes.map((axis) => `- ${axis}`).join('\n') : '- まだ設定されていません'}

【検討中のアイデア】:
${ideas.length > 0 ? ideas.map((idea) => `- ${idea.name}${idea.description ? `: ${idea.description}` : ''}`).join('\n') : '- まだアイデアがありません'}

${transcript ? `【議事録・議論の内容】:\n${transcript.slice(0, 1000)}${transcript.length > 1000 ? '...' : ''}` : ''}

以下の条件に従って、JSON形式で3つの評価軸を提案してください：

1. 既存の評価軸と重複しない
2. 議題の性質に適している
3. 具体的で測定可能
4. 議論の内容や文脈を反映している
5. 実際の意思決定に役立つ

回答形式：
[
  {
    "name": "評価軸名",
    "reason": "この軸を提案する理由（100文字以内）"
  },
  ...
]

例：
[
  {
    "name": "実装の難易度",
    "reason": "技術的な実現可能性を評価し、リソース配分の判断に重要"
  }
]
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // JSONレスポンスをパース
    try {
      const suggestions = JSON.parse(text.replace(/```json|```/g, '').trim());

      if (Array.isArray(suggestions)) {
        return suggestions.slice(0, 3); // 最大3つまで
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }

    // フォールバック: パースに失敗した場合のデフォルト提案
    return generateFallbackSuggestions(topicName, existingAxes);
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return generateFallbackSuggestions(topicName, existingAxes);
  }
}

function generateFallbackSuggestions(
  topicName: string,
  existingAxes: string[]
): SuggestedAxis[] {
  const commonAxes = [
    {
      name: 'コスト効率',
      reason: '費用対効果を評価し、予算内での最適解を見つけるため',
    },
    {
      name: '実現可能性',
      reason: '技術的・組織的な実行可能性を判断するため',
    },
    {
      name: '効果の大きさ',
      reason: '期待される成果やインパクトの規模を評価するため',
    },
    {
      name: 'リスクの低さ',
      reason: '潜在的なリスクや問題を事前に評価するため',
    },
    { name: '緊急性', reason: '実施の優先度や時間的制約を考慮するため' },
    { name: '持続性', reason: '長期的な効果や継続可能性を評価するため' },
    {
      name: 'ユーザビリティ',
      reason: '利用者の使いやすさや満足度を重視するため',
    },
    {
      name: '拡張性',
      reason: '将来的な成長や変更への対応力を評価するため',
    },
  ];

  // 既存の軸と重複しない提案を選択
  const availableAxes = commonAxes.filter(
    (axis) =>
      !existingAxes.some(
        (existing) =>
          existing.toLowerCase().includes(axis.name.toLowerCase()) ||
          axis.name.toLowerCase().includes(existing.toLowerCase())
      )
  );

  return availableAxes.slice(0, 3);
}
