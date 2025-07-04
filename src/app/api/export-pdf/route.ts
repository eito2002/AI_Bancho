import { NextRequest, NextResponse } from 'next/server';
import { getTopicData } from '@/lib/storage';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { topicId, judgeResult } = await request.json();

    // 議題データの取得
    const topic = await getTopicData(topicId);
    if (!topic) {
      return NextResponse.json(
        { success: false, error: '議題が見つかりません' },
        { status: 404 }
      );
    }

    // Markdownコンテンツの生成
    const markdownContent = generateMarkdownReport(topic, judgeResult);

    // 一時ファイルの作成
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const mdFilePath = path.join(tempDir, `report_${timestamp}.md`);
    const pdfFilePath = path.join(tempDir, `report_${timestamp}.pdf`);

    // Markdownファイルの書き込み
    fs.writeFileSync(mdFilePath, markdownContent);

    // PDFに変換
    await execAsync(`manus-md-to-pdf "${mdFilePath}" "${pdfFilePath}"`);

    // PDFファイルの読み込み
    const pdfBuffer = fs.readFileSync(pdfFilePath);

    // 一時ファイルの削除
    fs.unlinkSync(mdFilePath);
    fs.unlinkSync(pdfFilePath);

    // PDFファイルのレスポンス
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="AI採決結果_${topic.name}_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { success: false, error: 'PDFエクスポートに失敗しました' },
      { status: 500 }
    );
  }
}

function generateMarkdownReport(topic: any, judgeResult: any): string {
  const currentDate = new Date().toLocaleDateString('ja-JP');

  let markdown = `# AI意思決定支援ツール 採決結果レポート

**議題名**: ${topic.name}  
**作成日**: ${currentDate}
**判定モデル**: Gemini 2.5 Flash

---

## 📊 AI採決結果

### 🏆 総合一位
**${judgeResult?.winner?.name || 'データなし'}**

### 📈 ランキング
`;

  if (judgeResult?.ranking) {
    judgeResult.ranking.forEach((item: any, index: number) => {
      markdown += `${index + 1}. **${item.name}** (スコア: ${item.score})\n`;
    });
  }

  markdown += `
### 🎯 観点別一位
`;

  if (judgeResult?.axisBest) {
    Object.entries(judgeResult.axisBest).forEach(
      ([axis, winner]: [string, any]) => {
        markdown += `- **${axis}**: ${winner.name}\n`;
      }
    );
  }

  markdown += `
### 🤖 AI判定理由
${judgeResult?.reasoning || 'データなし'}

---

## 📋 評価対象アイデア

| アイデア名 | ${topic.axes.join(' | ')} |
|-----------|${topic.axes.map(() => '----------').join('|')}|
`;

  topic.ideas.forEach((idea: any) => {
    const evaluations = topic.axes
      .map((axis: string) => idea.evaluations[axis] || '-')
      .join(' | ');
    markdown += `| ${idea.name} | ${evaluations} |\n`;
  });

  if (topic.transcript && topic.transcript.entries.length > 0) {
    markdown += `
---

## 🎤 議事録・文字起こし

`;
    topic.transcript.entries.forEach((entry: any, index: number) => {
      markdown += `### ${index + 1}. ${entry.timestamp}
${entry.text}

`;
    });
  }

  markdown += `
---

## 📝 使用した評価軸
${judgeResult?.usedAxes ? judgeResult.usedAxes.map((axis: string) => `- ${axis}`).join('\n') : ''}

---

*このレポートはAI意思決定支援ツールによって自動生成されました。*
`;

  return markdown;
}
