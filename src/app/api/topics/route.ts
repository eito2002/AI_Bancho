import { NextRequest, NextResponse } from 'next/server';
import { getTopics, createTopic } from '@/lib/storage';
import { ApiResponse, Topic } from '@/types';

// GET /api/topics - 議題一覧取得
export async function GET(): Promise<NextResponse<ApiResponse<Topic[]>>> {
  try {
    const topics = getTopics();
    return NextResponse.json({
      success: true,
      data: topics,
    });
  } catch (error) {
    console.error('Error fetching topics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch topics',
      },
      { status: 500 }
    );
  }
}

// POST /api/topics - 新規議題作成
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Topic>>> {
  try {
    const body = await request.json();
    const { name, goal, axes } = body;

    if (!name || !axes || !Array.isArray(axes)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Name and axes are required.',
        },
        { status: 400 }
      );
    }

    const newTopic = createTopic(name, goal, axes);

    return NextResponse.json({
      success: true,
      data: newTopic,
    });
  } catch (error) {
    console.error('Error creating topic:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create topic',
      },
      { status: 500 }
    );
  }
}
