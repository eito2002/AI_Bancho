'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TranscriptData, TranscriptEntry } from '@/types';
import { Mic, MicOff, Send, User, Clock } from 'lucide-react';

interface TranscriptPanelProps {
  topicId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function TranscriptPanel({
  topicId,
  isOpen,
  onToggle,
}: TranscriptPanelProps) {
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [newText, setNewText] = useState('');
  const [speaker, setSpeaker] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTranscript();

    // 定期的に文字起こしデータを更新（リアルタイム模擬）
    const interval = setInterval(fetchTranscript, 5000);
    return () => clearInterval(interval);
  }, [topicId]);

  useEffect(() => {
    // 新しいエントリが追加されたら自動スクロール
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript?.entries]);

  const fetchTranscript = async () => {
    try {
      const response = await fetch(`/api/transcript?topicId=${topicId}`);
      const result = await response.json();

      if (result.success) {
        setTranscript(result.data);
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);
    }
  };

  const addTranscriptEntry = async () => {
    if (!newText.trim()) return;

    try {
      const response = await fetch('/api/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId,
          text: newText,
          speaker: speaker || '不明',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTranscript(result.data);
        setNewText('');
      }
    } catch (error) {
      console.error('Error adding transcript entry:', error);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // 実際の音声認識APIとの連携はここで実装
  };

  const formatTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={onToggle}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg"
        >
          <Mic className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">文字起こしログ</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onToggle}>
          ×
        </Button>
      </div>

      {/* 要約表示 */}
      {transcript?.summary && (
        <div className="p-3 bg-blue-50 border-b border-gray-200">
          <p className="text-sm text-blue-800">
            <strong>要約:</strong> {transcript.summary}
          </p>
        </div>
      )}

      {/* 文字起こしログ */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {transcript?.entries.map((entry) => (
          <div key={entry.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-3 w-3 text-gray-500" />
              <span className="text-xs font-medium text-gray-700">
                {entry.speaker}
              </span>
              <Clock className="h-3 w-3 text-gray-400 ml-auto" />
              <span className="text-xs text-gray-500">
                {formatTime(entry.timestamp)}
              </span>
            </div>
            <p className="text-sm text-gray-900">{entry.text}</p>
            {entry.confidence && (
              <div className="mt-1">
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="bg-green-500 h-1 rounded-full"
                    style={{ width: `${entry.confidence * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        ))}

        {(!transcript?.entries || transcript.entries.length === 0) && (
          <div className="text-center text-gray-500 py-8">
            <Mic className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">まだ文字起こしデータがありません</p>
          </div>
        )}
      </div>

      {/* 入力エリア */}
      <div className="p-3 border-t border-gray-200 space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="話者名"
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            className="flex-1"
          />
          <Button
            variant={isRecording ? 'destructive' : 'outline'}
            size="sm"
            onClick={toggleRecording}
          >
            {isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="発言内容を入力..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTranscriptEntry()}
            className="flex-1"
          />
          <Button size="sm" onClick={addTranscriptEntry}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
