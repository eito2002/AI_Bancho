import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio, mimeType } = body;

    if (!audio) {
      return NextResponse.json(
        {
          success: false,
          error: '音声データが必要です',
        },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gemini API キーが設定されていません',
        },
        { status: 500 }
      );
    }

    // Gemini Pro を使用
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Gemini に音声データを送信して文字起こし
    const prompt = `この音声ファイルの内容を日本語で文字起こししてください。話者が複数いる場合は、可能な限り話者を識別してください。
    
    出力形式：
    - 文字起こし結果のみを返してください
    - 話者が識別できる場合は「話者A:」「話者B:」等の形式で区別してください
    - 聞き取れない部分は[不明]と記載してください`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: audio,
          mimeType: mimeType || 'audio/webm',
        },
      },
    ]);

    const transcript = result.response.text();

    // 文字起こし結果をパースして話者ごとに分割
    const parsedEntries = parseTranscriptBySpeaker(transcript);

    return NextResponse.json({
      success: true,
      entries: parsedEntries,
      fullTranscript: transcript,
    });
  } catch (error) {
    console.error('音声文字起こしエラー:', error);

    let errorMessage = '音声の文字起こし中にエラーが発生しました';
    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        errorMessage = 'Gemini API キーが無効です';
      } else if (error.message.includes('quota')) {
        errorMessage = 'API使用量の上限に達しました';
      } else if (error.message.includes('format')) {
        errorMessage = '音声ファイルの形式がサポートされていません';
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// 文字起こし結果を話者ごとに分割する関数
function parseTranscriptBySpeaker(
  transcript: string
): Array<{ speaker: string; text: string }> {
  const entries: Array<{ speaker: string; text: string }> = [];

  // 改行で分割
  const lines = transcript.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // 話者識別パターン: "話者A:", "A:", "田中:", "司会:", など
    const speakerMatch = trimmedLine.match(
      /^(話者[A-Z]|[A-Z]+|[ぁ-んァ-ヶー一-龯]+|司会|モデレーター|参加者[0-9]*)\s*[:：]\s*(.+)$/
    );

    if (speakerMatch) {
      // 話者が識別できた場合
      const speaker = speakerMatch[1];
      const text = speakerMatch[2].trim();
      if (text) {
        entries.push({ speaker, text });
      }
    } else {
      // 話者が識別できない場合は前のエントリに追加するか、新しいエントリとして追加
      if (entries.length > 0) {
        // 前のエントリに追加
        entries[entries.length - 1].text += ' ' + trimmedLine;
      } else {
        // 最初のエントリとして追加
        entries.push({ speaker: '不明', text: trimmedLine });
      }
    }
  }

  // エントリが空の場合は、全体を一つのエントリとして扱う
  if (entries.length === 0) {
    entries.push({ speaker: '不明', text: transcript.trim() });
  }

  return entries;
}
