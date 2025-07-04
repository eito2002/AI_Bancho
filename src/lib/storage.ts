import fs from 'fs';
import path from 'path';
import { Topic, TopicDetail } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const TOPICS_FILE = path.join(DATA_DIR, 'topics.json');

// データディレクトリの初期化
export function initializeDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(TOPICS_FILE)) {
    fs.writeFileSync(TOPICS_FILE, JSON.stringify([], null, 2));
  }
}

// 議題一覧の取得
export function getTopics(): Topic[] {
  initializeDataDir();
  try {
    const data = fs.readFileSync(TOPICS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading topics:', error);
    return [];
  }
}

// 議題詳細の取得（非同期版）
export async function getTopicData(id: string): Promise<TopicDetail | null> {
  return getTopicById(id);
}

// 議題の保存（非同期版）
export async function saveTopicData(
  id: string,
  updates: Partial<TopicDetail>
): Promise<TopicDetail | null> {
  return updateTopic(id, updates);
}

// 議題詳細の取得
export function getTopicById(id: string): TopicDetail | null {
  const topics = getTopics();
  const topic = topics.find((t) => t.id === id);

  if (!topic) return null;

  // 詳細データファイルの読み込み
  const detailFile = path.join(DATA_DIR, `topic_${id}.json`);

  if (fs.existsSync(detailFile)) {
    try {
      const detailData = fs.readFileSync(detailFile, 'utf-8');
      return JSON.parse(detailData);
    } catch (error) {
      console.error('Error reading topic detail:', error);
    }
  }

  // 詳細ファイルが存在しない場合は基本情報から作成
  return {
    id: topic.id,
    name: topic.name,
    axes: topic.axes,
    ideas: [],
  };
}

// 新規議題の作成
export function createTopic(name: string, goal: string, axes: string[]): Topic {
  const topics = getTopics();
  const newTopic: Topic = {
    id: Date.now().toString(),
    name,
    goal: goal || undefined,
    axes,
  };

  topics.unshift(newTopic); // 先頭に追加
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(topics, null, 2));

  // 詳細ファイルの作成
  const topicDetail: TopicDetail = {
    id: newTopic.id,
    name,
    goal: goal || undefined,
    axes,
    ideas: [],
  };

  const detailFile = path.join(DATA_DIR, `topic_${newTopic.id}.json`);
  fs.writeFileSync(detailFile, JSON.stringify(topicDetail, null, 2));

  return newTopic;
}

// 議題の更新
export function updateTopic(
  id: string,
  updates: Partial<TopicDetail>
): TopicDetail | null {
  const currentDetail = getTopicById(id);
  if (!currentDetail) return null;

  const updatedDetail = { ...currentDetail, ...updates };

  // 詳細ファイルの更新
  const detailFile = path.join(DATA_DIR, `topic_${id}.json`);
  fs.writeFileSync(detailFile, JSON.stringify(updatedDetail, null, 2));

  // 基本情報の更新（名前や軸が変更された場合）
  if (updates.name || updates.axes) {
    const topics = getTopics();
    const topicIndex = topics.findIndex((t) => t.id === id);

    if (topicIndex !== -1) {
      if (updates.name) topics[topicIndex].name = updates.name;
      if (updates.axes) topics[topicIndex].axes = updates.axes;

      fs.writeFileSync(TOPICS_FILE, JSON.stringify(topics, null, 2));
    }
  }

  return updatedDetail;
}

// 議題の削除
export function deleteTopic(id: string): boolean {
  const topics = getTopics();
  const filteredTopics = topics.filter((t) => t.id !== id);

  if (filteredTopics.length === topics.length) {
    return false; // 削除対象が見つからない
  }

  fs.writeFileSync(TOPICS_FILE, JSON.stringify(filteredTopics, null, 2));

  // 詳細ファイルの削除
  const detailFile = path.join(DATA_DIR, `topic_${id}.json`);
  if (fs.existsSync(detailFile)) {
    fs.unlinkSync(detailFile);
  }

  return true;
}
