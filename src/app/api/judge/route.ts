import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ApiResponse, JudgeRequest, JudgeResult, Idea } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// POST /api/judge - AI採決（文字起こし対応版）
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<JudgeResult>>> {
  try {
    const body: JudgeRequest = await request.json();
    const { topicId, selectedAxes, transcript, ideas } = body;

    if (
      !topicId ||
      !selectedAxes ||
      !Array.isArray(selectedAxes) ||
      selectedAxes.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid request body. Topic ID and selected axes are required.',
        },
        { status: 400 }
      );
    }

    if (!ideas || !Array.isArray(ideas) || ideas.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Ideas are required.',
        },
        { status: 400 }
      );
    }

    // AI採決ロジック（文字起こし対応版）
    const result = await performAdvancedJudgment(
      selectedAxes,
      ideas,
      transcript
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in judge:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform judgment',
      },
      { status: 500 }
    );
  }
}

async function performAdvancedJudgment(
  axes: string[],
  ideas: Idea[],
  transcript?: string
): Promise<JudgeResult> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      // Gemini APIキーがない場合はフォールバック判定
      return performFallbackJudgment(axes, ideas, transcript);
    }

    // Gemini 2.5 Flash を使用
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // アイデア情報を整理
    const ideasInfo = ideas.map((idea) => ({
      id: idea.id,
      name: idea.name,
      description: idea.description || '説明なし',
      evaluations: axes.map((axis) => ({
        axis,
        evaluation: idea.evaluations[axis] || '未評価',
      })),
    }));

    // LLM用プロンプトを構築
    const prompt = `あなたは会議での意思決定支援の専門家です。会議での議論内容を最重視し、参加者の意見や合意形成の過程を反映した判定を行ってください。

${
  transcript
    ? `【最重要】会議の議論内容
${transcript}

上記の議論内容が判定の中核となります。参加者がどのアイデアを支持し、どのような懸念や賛成意見があったかを詳細に分析してください。`
    : ''
}

【評価対象のアイデア】
${ideasInfo
  .map(
    (idea, index) => `
${index + 1}. **${idea.name}**
   説明: ${idea.description}
   評価:
${idea.evaluations.map((ev) => `   - ${ev.axis}: ${ev.evaluation}`).join('\n')}
`
  )
  .join('\n')}

【使用する評価軸】
${axes.map((axis, index) => `${index + 1}. ${axis}`).join('\n')}

【判定の優先順位】
1. **議論での支持・反対の声** (最重要)
2. **参加者の合意度合い**
3. **議論で挙がった具体的な懸念事項**
4. **発言の頻度や熱量**
5. 評価軸での個別評価

【判定指示】
1. 議論内容から各アイデアへの支持度を分析
2. 参加者の懸念や賛成理由を重視した順位付け
3. 議論の流れと合意形成を反映した最終判定
4. 必ず以下のJSON形式で回答してください:

{
  "winner": {
    "id": "最優秀アイデアのID",
    "name": "最優秀アイデア名"
  },
  "ranking": [
    {
      "ideaId": "アイデアID",
      "ideaName": "アイデア名", 
      "score": 数値スコア(0-100)
    }
  ],
  "axisWinners": {
    "評価軸名": {
      "id": "アイデアID",
      "name": "アイデア名",
      "reason": "選出理由（議論での支持内容を含む）"
    }
  },
  "reasoning": "議論内容に基づく判定理由（参加者の発言や合意内容を具体的に引用）",
  "transcriptSummary": "${transcript ? '議論の要点と決定に至った経緯の要約' : ''}"
}

【重要】
- 機械的な公平性よりも、実際の議論での合意形成を重視してください
- 参加者が強く支持したアイデアを優先してください
- 議論で出た懸念事項は必ず判定に反映してください
- 発言内容を具体的に引用して判定根拠としてください
- JSON形式以外の回答は含めないでください`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    try {
      // JSONレスポンスをパース（マークダウンコードブロックを除去）
      let jsonText = text.trim();

      // ```json と ``` を除去
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const llmResult = JSON.parse(jsonText);

      // 必要なフィールドの検証と補完
      const validatedResult: JudgeResult = {
        winner: llmResult.winner || {
          id: ideas[0]?.id || '',
          name: ideas[0]?.name || '',
        },
        ranking:
          llmResult.ranking ||
          ideas.map((idea, index) => ({
            ideaId: idea.id,
            ideaName: idea.name,
            score: 100 - index * 10,
          })),
        axisWinners: llmResult.axisWinners || {},
        usedAxes: axes,
        reasoning: llmResult.reasoning || 'LLMによる判定が完了しました。',
        transcriptSummary: transcript
          ? llmResult.transcriptSummary || generateTranscriptSummary(transcript)
          : undefined,
      };

      return validatedResult;
    } catch (parseError) {
      console.error('LLM判定結果のパースに失敗:', parseError);
      console.error('LLM Raw Response:', text);

      // パース失敗時はフォールバック判定
      return performFallbackJudgment(axes, ideas, transcript);
    }
  } catch (error) {
    console.error('LLM判定エラー:', error);

    // エラー時はフォールバック判定
    return performFallbackJudgment(axes, ideas, transcript);
  }
}

// フォールバック判定（元のルールベース判定）
async function performFallbackJudgment(
  axes: string[],
  ideas: Idea[],
  transcript?: string
): Promise<JudgeResult> {
  // 各アイデアの総合スコア計算
  const ranking = ideas
    .map((idea) => {
      let totalScore = 0;
      let validAxes = 0;

      axes.forEach((axis) => {
        const evaluation = idea.evaluations[axis];
        if (evaluation && evaluation !== '不明') {
          const score = calculateEvaluationScore(evaluation);
          totalScore += score;
          validAxes++;
        }
      });

      const averageScore = validAxes > 0 ? totalScore / validAxes : 0;

      // 文字起こしがある場合は追加の重み付け
      let transcriptBonus = 0;
      if (transcript) {
        transcriptBonus = calculateTranscriptBonus(idea.name, transcript);
      }

      return {
        ideaId: idea.id,
        ideaName: idea.name,
        score: averageScore + transcriptBonus,
      };
    })
    .sort((a, b) => b.score - a.score);

  // 各軸での1位を計算
  const axisWinners: Record<
    string,
    { id: string; name: string; reason: string }
  > = {};

  axes.forEach((axis) => {
    const axisRanking = ideas
      .filter(
        (idea) => idea.evaluations[axis] && idea.evaluations[axis] !== '不明'
      )
      .map((idea) => ({
        id: idea.id,
        name: idea.name,
        score: calculateEvaluationScore(idea.evaluations[axis]),
        evaluation: idea.evaluations[axis],
      }))
      .sort((a, b) => b.score - a.score);

    if (axisRanking.length > 0) {
      const winner = axisRanking[0];
      axisWinners[axis] = {
        id: winner.id,
        name: winner.name,
        reason: `${axis}の観点で最も高い評価: "${winner.evaluation}"`,
      };
    }
  });

  const winner = ranking[0];

  // 文字起こし要約の生成
  const transcriptSummary = transcript
    ? generateTranscriptSummary(transcript)
    : undefined;

  // 判定理由の生成
  const reasoning = generateAdvancedReasoning(
    winner,
    axes,
    axisWinners,
    transcriptSummary
  );

  return {
    winner: {
      id: winner.ideaId,
      name: winner.ideaName,
    },
    ranking,
    axisWinners,
    usedAxes: axes,
    reasoning,
    transcriptSummary,
  };
}

function calculateEvaluationScore(evaluation: string): number {
  // 評価テキストから数値スコアを計算
  const positiveKeywords = [
    '優れている',
    '良い',
    '高い',
    '大きい',
    '効果的',
    '有効',
    '適切',
    '強い',
  ];
  const negativeKeywords = [
    '悪い',
    '低い',
    '小さい',
    '困難',
    '問題',
    '課題',
    '弱い',
    '不適切',
  ];

  let score = 50; // ベーススコア

  positiveKeywords.forEach((keyword) => {
    if (evaluation.includes(keyword)) score += 15;
  });

  negativeKeywords.forEach((keyword) => {
    if (evaluation.includes(keyword)) score -= 10;
  });

  return Math.max(0, Math.min(100, score));
}

function calculateTranscriptBonus(
  ideaName: string,
  transcript: string
): number {
  // 文字起こしでのアイデア言及頻度に基づくボーナス
  const mentions = (
    transcript.toLowerCase().match(new RegExp(ideaName.toLowerCase(), 'g')) ||
    []
  ).length;
  return Math.min(mentions * 2, 10); // 最大10点のボーナス
}

function generateTranscriptSummary(transcript: string): string {
  // 簡易的な文字起こし要約
  const sentences = transcript
    .split(/[。！？]/)
    .filter((s) => s.trim().length > 0);
  const importantSentences = sentences.slice(0, 3); // 最初の3文
  return (
    importantSentences.join('。') + (importantSentences.length > 0 ? '。' : '')
  );
}

function generateAdvancedReasoning(
  winner: { ideaId: string; ideaName: string; score: number },
  axes: string[],
  axisWinners: Record<string, { id: string; name: string; reason: string }>,
  transcriptSummary?: string
): string {
  let reasoning = `選択された評価軸「${axes.join('、')}」に基づいて総合的に判断した結果、「${winner.ideaName}」が最も優れたアイデアとして選ばれました。\n\n`;

  // 各軸での評価
  reasoning += '【軸別評価】\n';
  axes.forEach((axis) => {
    const axisWinner = axisWinners[axis];
    if (axisWinner) {
      reasoning += `・${axis}: ${axisWinner.name}が1位（${axisWinner.reason}）\n`;
    }
  });

  // 文字起こし情報
  if (transcriptSummary) {
    reasoning += `\n【議事録からの考慮事項】\n${transcriptSummary}\n`;
  }

  reasoning += `\n総合的に、「${winner.ideaName}」が最もバランスの取れた優秀なアイデアと判定されました。`;

  return reasoning;
}
