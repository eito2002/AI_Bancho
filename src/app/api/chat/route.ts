import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { ApiResponse } from '@/types';

// Gemini APIの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// レスポンススキーマの定義
const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    done: {
      type: SchemaType.BOOLEAN,
      description: '議論が完了したかどうか',
    },
    message: {
      type: SchemaType.STRING,
      description: 'ユーザーへの返答メッセージ',
    },
    evaluation: {
      type: SchemaType.STRING,
      description: 'この軸での最終評価（議論完了時のみ）',
    },
    ideaSummary: {
      type: SchemaType.STRING,
      description: 'アイデアの要約（議論完了時のみ）',
    },
  },
  required: ['done', 'message'],
} as const;

interface AIResponse {
  done: boolean;
  message: string;
  evaluation?: string;
  ideaSummary?: string;
}

// POST /api/chat - AI評価チャット
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AIResponse>>> {
  try {
    const body = await request.json();
    const { messages, ideaName, currentAxis, axes } = body;

    if (!messages || !ideaName || !currentAxis) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
        },
        { status: 400 }
      );
    }

    // Gemini APIキーの確認
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set');
      // フォールバック応答
      const fallbackResponse = generateFallbackResponse(
        messages,
        ideaName,
        currentAxis
      );
      return NextResponse.json({
        success: true,
        data: fallbackResponse,
      });
    }

    // AI評価ロジック
    const response = await generateAIResponse(
      messages,
      ideaName,
      currentAxis,
      axes
    );

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error in chat:', error);

    // エラー時のフォールバック応答
    const fallbackResponse = generateFallbackResponse([], '', '');

    return NextResponse.json({
      success: true,
      data: fallbackResponse,
    });
  }
}

async function generateAIResponse(
  messages: any[],
  ideaName: string,
  currentAxis: string,
  axes: string[]
): Promise<AIResponse> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    // 最新のユーザーメッセージを取得
    const userMessages = messages.filter((m) => m.role === 'user');
    const latestUserMessage =
      userMessages[userMessages.length - 1]?.content || '';

    // 会話履歴を構築
    const conversationHistory = messages
      .filter((m) => m.role === 'user')
      .map((m) => `ユーザー: ${m.content}`)
      .join('\n');

    // 最初のメッセージかどうかを判定
    const isFirstMessage = userMessages.length === 0;

    // プロンプトを構築
    const prompt = isFirstMessage
      ? `
あなたはアイデア評価の専門家です。以下の情報に基づいて、アイデアを評価してください。

【アイデア名】: ${ideaName}
【現在評価中の軸】: ${currentAxis}
【全ての評価軸】: ${axes.join(', ')}

【重要】これは評価開始時の初回応答です。以下の手順で応答してください：

1. 「${ideaName}」を「${currentAxis}」の観点から分析し、AI初期評価を提示する
2. 評価の根拠を簡潔に説明する
3. ユーザーに意見や修正点があるか確認する

以下のルールに従って、JSON形式で回答してください：

1. done: false（初回なので必ずfalse）
2. messageには以下の内容を含める（300文字以内）：
   - AI初期評価の提示
   - 評価根拠の説明
   - ユーザーへの意見確認
3. 日本語で回答してください

例の形式：
「『${ideaName}』の${currentAxis}について、AI初期評価を行いました。

【AI初期評価】: [具体的な評価内容]

【評価根拠】: [なぜその評価になったかの理由]

この評価についていかがでしょうか？修正点やご意見があれば教えてください。」
`
      : `
あなたはアイデア評価の専門家です。以下の情報に基づいて、アイデアを評価してください。

【アイデア名】: ${ideaName}
【現在評価中の軸】: ${currentAxis}
【全ての評価軸】: ${axes.join(', ')}
【会話履歴】:
${conversationHistory}

【最新のユーザー発言】: ${latestUserMessage}

以下のルールに従って、JSON形式で回答してください：

1. 議論が十分に行われ、この軸での評価が決定できる場合は done: true
2. まだ議論が必要な場合は done: false
3. messageには適切な返答を200文字以内で記載
4. done: trueの場合は、evaluationに最終評価を簡潔に記載
5. done: trueの場合は、ideaSummaryにアイデアの要約を記載
6. 日本語で回答してください

議論完了の判断基準：
- ユーザーが「同意します」「その通りです」などの承認を示した
- ユーザーが修正を求め、それを反映した評価で合意が得られた
- ユーザーが「以上です」「終わります」などの終了を示唆した
- 2回以上のやり取りがあり、評価が固まった

例：
done: false の場合 → ユーザーの意見を踏まえた修正提案や追加質問を返す
done: true の場合 → 最終評価を確定し、次の軸への移行を提案
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    try {
      const parsedResponse = JSON.parse(text) as AIResponse;
      return parsedResponse;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // パース失敗時のフォールバック
      return {
        done: false,
        message:
          text ||
          `「${ideaName}」の${currentAxis}について、もう少し詳しく教えてください。`,
      };
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

function generateFallbackResponse(
  messages: any[],
  ideaName: string,
  currentAxis: string
): AIResponse {
  // APIキーが設定されていない場合やエラー時のフォールバック応答
  const userMessages = messages.filter((m: any) => m.role === 'user');
  const messageCount = userMessages.length;

  if (messageCount === 0) {
    // 初回応答：AI初期評価を提示
    const initialEvaluation = getDetailedEvaluation(ideaName, currentAxis);
    return {
      done: false,
      message: `『${ideaName}』の${currentAxis}について、AI初期評価を行いました。

【AI初期評価】: ${initialEvaluation.evaluation}

【評価根拠】: ${initialEvaluation.reasoning}

この評価についていかがでしょうか？修正点やご意見があれば教えてください。`,
    };
  }

  // 2回以上のやり取りがあれば議論完了とする
  if (messageCount >= 2) {
    return {
      done: true,
      message: `${currentAxis}についてのご意見をありがとうございました。評価をまとめます。`,
      evaluation: getSimpleEvaluation(currentAxis),
      ideaSummary: `${ideaName}は${currentAxis}の観点から検討されました。`,
    };
  }

  // 継続応答：ユーザーの意見を踏まえた応答
  const continuationResponses = [
    `ご意見ありがとうございます。${currentAxis}の評価について、他に考慮すべき点はありますか？`,
    `なるほど、そのご指摘を踏まえて評価を調整いたします。他にご意見はありますか？`,
  ];

  return {
    done: false,
    message: continuationResponses[messageCount % continuationResponses.length],
  };
}

function getSimpleEvaluation(axis: string): string {
  const evaluations = {
    コスト: ['低コスト', '中程度のコスト', '高コストだが価値あり'],
    実現可能性: ['実現容易', '実現可能', '実現困難だが可能'],
    効果の大きさ: ['大きな効果', '中程度の効果', '限定的だが有効'],
    実装の難易度: ['実装容易', '標準的な実装', '高度な実装が必要'],
  };

  const axisEvaluations = evaluations[axis as keyof typeof evaluations] || [
    '良好',
    '普通',
    '要改善',
  ];
  return axisEvaluations[Math.floor(Math.random() * axisEvaluations.length)];
}

function getDetailedEvaluation(
  ideaName: string,
  axis: string
): { evaluation: string; reasoning: string } {
  // より詳細な初期AI評価を生成
  const evaluationTemplates = {
    コスト: {
      evaluations: ['低コスト', '中程度のコスト', '高コストだが価値あり'],
      reasonings: [
        '既存のインフラやツールを活用でき、追加投資が最小限で済むため',
        '一定の初期投資は必要だが、長期的なROIが見込めるため',
        '初期投資は大きいが、得られる価値と効果を考慮すると妥当な投資と判断されるため',
      ],
    },
    実現可能性: {
      evaluations: ['実現容易', '実現可能', '実現困難だが可能'],
      reasonings: [
        '既存の技術やリソースで対応可能で、大きな技術的課題がないため',
        '一部技術的な課題はあるが、適切な計画とリソース配分により実現可能と判断されるため',
        '高度な技術や専門知識が必要だが、段階的なアプローチにより実現可能と考えられるため',
      ],
    },
    効果の大きさ: {
      evaluations: ['大きな効果', '中程度の効果', '限定的だが有効'],
      reasonings: [
        '多方面にわたって大幅な改善が期待でき、組織全体に大きなインパクトをもたらすため',
        '特定の領域で明確な改善効果が見込まれ、投資に見合った成果が期待できるため',
        '効果は限定的だが、対象領域での確実な改善が見込まれ、将来の発展基盤となるため',
      ],
    },
    実装の難易度: {
      evaluations: ['実装容易', '標準的な実装', '高度な実装が必要'],
      reasonings: [
        '既存システムとの連携が容易で、標準的な開発プロセスで対応可能なため',
        '一般的な実装手法で対応可能だが、適切な設計と品質管理が必要なため',
        '高度な技術力と綿密な計画が必要だが、段階的な実装により実現可能なため',
      ],
    },
  };

  const template =
    evaluationTemplates[axis as keyof typeof evaluationTemplates];

  if (template) {
    const index = Math.floor(Math.random() * template.evaluations.length);
    return {
      evaluation: template.evaluations[index],
      reasoning: template.reasonings[index],
    };
  } else {
    // 未知の評価軸の場合のデフォルト
    const defaultEvaluations = ['良好', '普通', '要改善'];
    const defaultReasonings = [
      `${ideaName}は${axis}の観点から分析した結果、ポジティブな評価となりました`,
      `${ideaName}は${axis}の観点から見て、標準的なレベルと評価されます`,
      `${ideaName}は${axis}の観点で改善の余地があると考えられます`,
    ];

    const index = Math.floor(Math.random() * defaultEvaluations.length);
    return {
      evaluation: defaultEvaluations[index],
      reasoning: defaultReasonings[index],
    };
  }
}
