import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ApiResponse } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface AutoEvaluateRequest {
  ideaName: string;
  description?: string;
  axes: string[];
  topicName?: string;
  topicGoal?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Record<string, string>>>> {
  try {
    const body: AutoEvaluateRequest = await request.json();
    const { ideaName, description, axes, topicName, topicGoal } = body;

    if (!ideaName || !axes || axes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Idea name and axes are required',
        },
        { status: 400 }
      );
    }

    const evaluations = await generateAutoEvaluations(
      ideaName,
      description,
      axes,
      topicName,
      topicGoal
    );

    return NextResponse.json({
      success: true,
      data: evaluations,
    });
  } catch (error) {
    console.error('Error generating auto evaluations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate evaluations',
      },
      { status: 500 }
    );
  }
}

async function generateAutoEvaluations(
  ideaName: string,
  description?: string,
  axes: string[] = [],
  topicName?: string,
  topicGoal?: string
): Promise<Record<string, string>> {
  if (!process.env.GEMINI_API_KEY) {
    // フォールバック評価
    return generateFallbackEvaluations(ideaName, axes);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
あなたは専門的なアイデア評価のエキスパートです。以下のアイデアを各評価軸に沿って自動評価してください。

【議題名】: ${topicName || '未設定'}
${topicGoal ? `【議論の目標】: ${topicGoal}` : ''}

【評価対象アイデア】
アイデア名: ${ideaName}
${description ? `説明: ${description}` : ''}

【評価軸】:
${axes.map((axis, index) => `${index + 1}. ${axis}`).join('\n')}

以下の条件に従って、JSON形式で各軸の評価を生成してください：

1. 各評価は50-150文字程度の具体的な内容
2. アイデアの特徴と軸の観点を関連付けた評価
3. 実用的で建設的な評価内容
4. ポジティブな面と注意点の両方を含む
5. 議題の目標に沿った評価

回答形式：
{
  "評価軸名1": "具体的な評価内容...",
  "評価軸名2": "具体的な評価内容...",
  ...
}

例：
{
  "実現可能性": "技術的には実現可能ですが、初期投資とシステム統合に時間が必要です。段階的な導入により実現性を高められます。",
  "コスト効率": "初期コストは高めですが、長期的な運用効率化により投資回収が期待できます。ROI分析が重要です。"
}
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    try {
      // JSONレスポンスをパース
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const evaluations = JSON.parse(jsonMatch[0]);

        // 評価軸名の正規化
        const normalizedEvaluations: Record<string, string> = {};
        axes.forEach((axis) => {
          if (evaluations[axis]) {
            normalizedEvaluations[axis] = evaluations[axis];
          } else {
            // 部分一致で検索
            const matchingKey = Object.keys(evaluations).find(
              (key) => key.includes(axis) || axis.includes(key)
            );
            if (matchingKey) {
              normalizedEvaluations[axis] = evaluations[matchingKey];
            } else {
              normalizedEvaluations[axis] = generateFallbackEvaluation(
                ideaName,
                axis
              );
            }
          }
        });

        return normalizedEvaluations;
      } else {
        throw new Error('Invalid JSON response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return generateFallbackEvaluations(ideaName, axes);
    }
  } catch (error) {
    console.error('Error with Gemini API:', error);
    return generateFallbackEvaluations(ideaName, axes);
  }
}

function generateFallbackEvaluations(
  ideaName: string,
  axes: string[]
): Record<string, string> {
  const evaluations: Record<string, string> = {};

  axes.forEach((axis) => {
    evaluations[axis] = generateFallbackEvaluation(ideaName, axis);
  });

  return evaluations;
}

function generateFallbackEvaluation(ideaName: string, axis: string): string {
  const templates: Record<string, string[]> = {
    実現可能性: [
      `「${ideaName}」は技術的に実現可能ですが、適切な計画と実装が必要です。`,
      `「${ideaName}」の実現には時間と資源が必要ですが、段階的なアプローチで実現可能です。`,
      `「${ideaName}」は現在の技術水準で実現可能性が高いと評価されます。`,
    ],
    コスト効率: [
      `「${ideaName}」は初期投資が必要ですが、長期的なコスト削減効果が期待できます。`,
      `「${ideaName}」のコストパフォーマンスは良好で、投資対効果が見込めます。`,
      `「${ideaName}」は費用対効果を慎重に検討する必要がありますが、適切な価値を提供します。`,
    ],
    実装の難易度: [
      `「${ideaName}」の実装は標準的な難易度で、適切なスキルセットがあれば対応可能です。`,
      `「${ideaName}」は技術的な挑戦を含みますが、計画的なアプローチで実装できます。`,
      `「${ideaName}」の実装は複雑ですが、段階的な開発により実現可能です。`,
    ],
  };

  // 軸名に基づいてテンプレートを選択
  let selectedTemplates = templates['実現可能性']; // デフォルト

  for (const [key, template] of Object.entries(templates)) {
    if (axis.includes(key) || key.includes(axis)) {
      selectedTemplates = template;
      break;
    }
  }

  // ランダムにテンプレートを選択
  const randomIndex = Math.floor(Math.random() * selectedTemplates.length);
  return selectedTemplates[randomIndex];
}
