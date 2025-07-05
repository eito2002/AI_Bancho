import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, TranscriptData, TranscriptEntry } from '@/types';
import { getTopicData, saveTopicData } from '@/lib/storage';

// GET /api/transcript?topicId=xxx - 文字起こしデータ取得
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<TranscriptData>>> {
  try {
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');

    if (!topicId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Topic ID is required',
        },
        { status: 400 }
      );
    }

    const topic = await getTopicData(topicId);
    if (!topic) {
      return NextResponse.json(
        {
          success: false,
          error: 'Topic not found',
        },
        { status: 404 }
      );
    }

    const transcript = topic.transcript || {
      entries: [],
      lastUpdated: new Date(),
    };

    return NextResponse.json({
      success: true,
      data: transcript,
    });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transcript',
      },
      { status: 500 }
    );
  }
}

// POST /api/transcript - 文字起こしエントリ追加
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<TranscriptData>>> {
  try {
    const body = await request.json();
    const { topicId, text, speaker } = body;

    if (!topicId || !text) {
      return NextResponse.json(
        {
          success: false,
          error: 'Topic ID and text are required',
        },
        { status: 400 }
      );
    }

    const topic = await getTopicData(topicId);
    if (!topic) {
      return NextResponse.json(
        {
          success: false,
          error: 'Topic not found',
        },
        { status: 404 }
      );
    }

    // 新しい文字起こしエントリを作成
    const newEntry: TranscriptEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      speaker: speaker || '不明',
      text: text.trim(),
      confidence: Math.random() * 0.2 + 0.8, // 模擬的な信頼度
    };

    // 既存の文字起こしデータを更新
    const currentTranscript = topic.transcript || {
      entries: [],
      lastUpdated: new Date(),
    };
    const updatedTranscript: TranscriptData = {
      entries: [...currentTranscript.entries, newEntry],
      summary: await generateTranscriptSummary([
        ...currentTranscript.entries,
        newEntry,
      ]),
      lastUpdated: new Date(),
    };

    // トピックデータを更新
    const updatedTopic = {
      ...topic,
      transcript: updatedTranscript,
    };

    await saveTopicData(topicId, updatedTopic);

    return NextResponse.json({
      success: true,
      data: updatedTranscript,
    });
  } catch (error) {
    console.error('Error adding transcript entry:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add transcript entry',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/transcript - 文字起こしエントリ削除
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<ApiResponse<TranscriptData>>> {
  try {
    const body = await request.json();
    const { topicId, entryId } = body;

    if (!topicId || !entryId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Topic ID and entry ID are required',
        },
        { status: 400 }
      );
    }

    const topic = await getTopicData(topicId);
    if (!topic) {
      return NextResponse.json(
        {
          success: false,
          error: 'Topic not found',
        },
        { status: 404 }
      );
    }

    // 既存の文字起こしデータから指定されたエントリを削除
    const currentTranscript = topic.transcript || {
      entries: [],
      lastUpdated: new Date(),
    };

    const updatedEntries = currentTranscript.entries.filter(
      (entry) => entry.id !== entryId
    );

    const updatedTranscript: TranscriptData = {
      entries: updatedEntries,
      summary:
        updatedEntries.length > 0
          ? await generateTranscriptSummary(updatedEntries)
          : undefined,
      lastUpdated: new Date(),
    };

    // トピックデータを更新
    const updatedTopic = {
      ...topic,
      transcript: updatedTranscript,
    };

    await saveTopicData(topicId, updatedTopic);

    return NextResponse.json({
      success: true,
      data: updatedTranscript,
    });
  } catch (error) {
    console.error('Error deleting transcript entry:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete transcript entry',
      },
      { status: 500 }
    );
  }
}

async function generateTranscriptSummary(
  entries: TranscriptEntry[]
): Promise<string> {
  // 簡易的な要約生成（実際のAI APIを使用する場合はここを置き換え）
  if (entries.length === 0) return '';

  const recentEntries = entries.slice(-10); // 最新10件
  const totalText = recentEntries.map((e) => e.text).join(' ');

  if (totalText.length < 100) {
    return totalText;
  }

  // 簡易的な要約（最初の100文字 + "..."）
  return totalText.substring(0, 100) + '...';
}
