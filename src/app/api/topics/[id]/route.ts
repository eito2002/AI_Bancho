import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, TopicDetail } from '@/types';
import { getTopicData, saveTopicData } from '@/lib/storage';

// GET /api/topics/[id] - 議題詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<TopicDetail>>> {
  try {
    const { id } = await params;
    const topic = await getTopicData(id);

    if (!topic) {
      return NextResponse.json(
        {
          success: false,
          error: 'Topic not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: topic,
    });
  } catch (error) {
    console.error('Error fetching topic detail:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch topic detail',
      },
      { status: 500 }
    );
  }
}

// PUT /api/topics/[id] - 議題更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<TopicDetail>>> {
  try {
    const { id } = await params;
    const body = await request.json();
    const updatedTopic = await saveTopicData(id, body);

    if (!updatedTopic) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update topic',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedTopic,
    });
  } catch (error) {
    console.error('Error updating topic:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update topic',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/topics/[id] - 議題削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<boolean>>> {
  try {
    const deleted = deleteTopic(params.id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Topic not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: true,
    });
  } catch (error) {
    console.error('Error deleting topic:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete topic',
      },
      { status: 500 }
    );
  }
}
