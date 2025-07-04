import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ApiResponse } from '@/types';

// Gemini APIの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface SuggestedIdea {
  name: string;
  description: string;
  reason: string;
}

interface SuggestIdeasRequest {
  topicName: string;
  goal?: string;
  axes: string[];
  transcript?: string;
  existingIdeas: Array<{ name: string; description?: string }>;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<SuggestedIdea[]>>> {
  try {
    const body: SuggestIdeasRequest = await request.json();
    const { topicName, goal, axes, transcript, existingIdeas } = body;

    if (!topicName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Topic name is required',
        },
        { status: 400 }
      );
    }

    const suggestions = await generateIdeaSuggestions(
      topicName,
      goal,
      axes,
      transcript,
      existingIdeas
    );

    return NextResponse.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Error generating idea suggestions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate suggestions',
      },
      { status: 500 }
    );
  }
}

async function generateIdeaSuggestions(
  topicName: string,
  goal?: string,
  axes: string[] = [],
  transcript?: string,
  existingIdeas: Array<{ name: string; description?: string }> = []
): Promise<SuggestedIdea[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // プロンプトを構築
    const prompt = `
あなたは創造的なアイデア発想の専門家です。以下の情報を基に、議論に有益な新しいアイデアを3つ提案してください。

【議題名】: ${topicName}
${goal ? `【議論の目標】: ${goal}` : ''}

【評価軸】:
${axes.length > 0 ? axes.map((axis) => `- ${axis}`).join('\n') : '- まだ設定されていません'}

【既存のアイデア】:
${existingIdeas.length > 0 ? existingIdeas.map((idea) => `- ${idea.name}${idea.description ? `: ${idea.description}` : ''}`).join('\n') : '- まだアイデアがありません'}

${transcript ? `【議事録・議論の内容】:\n${transcript.slice(0, 1000)}${transcript.length > 1000 ? '...' : ''}` : ''}

以下の条件に従って、JSON形式で3つのアイデアを提案してください：

1. 既存のアイデアと重複しない
2. 議題の性質に適している
3. 実現可能性がある
4. 議論の内容や文脈を反映している
5. 評価軸で比較検討できる
6. 創造的で価値のある提案

回答形式：
[
  {
    "name": "アイデア名（30文字以内）",
    "description": "アイデアの詳細説明（100文字以内）",
    "reason": "このアイデアを提案する理由（80文字以内）"
  },
  ...
]

例：
[
  {
    "name": "AIチャットボット導入",
    "description": "顧客サポートにAIチャットボットを導入し、24時間対応と効率化を実現する",
    "reason": "コスト削減と顧客満足度向上の両方を達成できる実用的なソリューション"
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
    return generateFallbackSuggestions(topicName, existingIdeas);
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return generateFallbackSuggestions(topicName, existingIdeas);
  }
}

function generateFallbackSuggestions(
  topicName: string,
  existingIdeas: Array<{ name: string; description?: string }>
): SuggestedIdea[] {
  const commonIdeas = [
    {
      name: 'プロセス改善案',
      description: '現在の業務プロセスを見直し、効率化を図る改善案',
      reason: '既存システムの最適化により確実な成果が期待できる',
    },
    {
      name: '技術導入案',
      description: '新しい技術やツールを導入して課題を解決する案',
      reason: '技術革新により大幅な改善効果が見込める',
    },
    {
      name: '体制変更案',
      description: '組織体制や運用方法を変更して問題に対処する案',
      reason: '人的リソースの再配置により柔軟な対応が可能',
    },
    {
      name: '外部連携案',
      description: '外部パートナーや専門サービスと連携して解決を図る案',
      reason: '専門知識やリソースを活用して効率的に実現できる',
    },
    {
      name: '段階的実施案',
      description: '大きな変更を段階的に実施してリスクを軽減する案',
      reason: 'リスクを抑えながら確実に目標達成できる現実的なアプローチ',
    },
  ];

  // 既存のアイデアと重複しない提案を選択
  const availableIdeas = commonIdeas.filter(
    (idea) =>
      !existingIdeas.some(
        (existing) =>
          existing.name
            .toLowerCase()
            .includes(idea.name.replace('案', '').toLowerCase()) ||
          idea.name.toLowerCase().includes(existing.name.toLowerCase())
      )
  );

  return availableIdeas.slice(0, 3);
}
