'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';

interface RecordingButtonProps {
  onTranscript?: (text: string, speaker?: string) => void;
  onTranscriptEntries?: (
    entries: Array<{ speaker: string; text: string }>
  ) => void;
  className?: string;
}

export function RecordingButton({
  onTranscript,
  onTranscriptEntries,
  className,
}: RecordingButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });
        stream.getTracks().forEach((track) => track.stop());

        if (audioBlob.size > 0) {
          await processAudioWithGemini(audioBlob);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // 1秒ごとにデータを記録
      setIsRecording(true);
    } catch (error) {
      console.error('録音開始エラー:', error);
      alert(
        'マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。'
      );
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  }, [isRecording]);

  const processAudioWithGemini = async (audioBlob: Blob) => {
    try {
      // 音声をbase64に変換（FileReaderを使用してスタックオーバーフローを回避）
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // data:audio/webm;base64, プレフィックスを除去
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Gemini APIに音声を送信
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: 'audio/webm',
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.entries && onTranscriptEntries) {
          // 複数エントリの場合
          onTranscriptEntries(result.entries);
        } else if (result.transcript && onTranscript) {
          // 単一エントリの場合（後方互換性）
          onTranscript(result.transcript, result.speaker);
        }
      } else {
        console.error('文字起こし失敗:', result.error);
        alert('音声の文字起こしに失敗しました。');
      }
    } catch (error) {
      console.error('音声処理エラー:', error);
      alert('音声の処理中にエラーが発生しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isProcessing}
      variant={isRecording ? 'destructive' : 'outline'}
      className={`flex items-center gap-2 ${className}`}
    >
      {isProcessing ? (
        <>
          <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
          処理中...
        </>
      ) : isRecording ? (
        <>
          <Square className="h-4 w-4" />
          録音停止
        </>
      ) : (
        <>
          <Mic className="h-4 w-4" />
          録音開始
        </>
      )}
    </Button>
  );
}
