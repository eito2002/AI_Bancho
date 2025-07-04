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

    // 音声データを base64 からバイナリに変換
    const audioData = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));

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

    // 話者を識別
    let speaker = '不明';
    const speakerMatch = transcript.match(/^(話者[A-Z]|[A-Z]+):/);
    if (speakerMatch) {
      speaker = speakerMatch[1];
    }

    return NextResponse.json({
      success: true,
      transcript: transcript.replace(/^(話者[A-Z]|[A-Z]+):/, '').trim(),
      speaker,
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
