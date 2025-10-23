import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getAudioToken } from '@/utils/audioUtils';

interface AudioPlayerProps {
  evaluationId?: number;
  audioUrl?: string; // 支持直接传入URL（向后兼容）
  className?: string;
  onError?: (error: string) => void;
}

export default function AudioPlayer({ evaluationId, audioUrl, className, onError }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);


  const loadAudio = async (evalId: number) => {
    try {
      setLoading(true);
      setError(null); // 清除之前的错误
      
      // 步骤1：获取音频令牌 (按照文档API指南)
      const audioData = await getAudioToken(evalId);
      
      // 步骤2：获取音频文件 (按照文档API指南)
      const response = await fetch(audioData.signed_url, {
        headers: {
          'Authorization': `Bearer ${audioData.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`获取音频文件失败: ${response.status}`);
      }
      
      const audioBlob = await response.blob();
      const newBlobUrl = URL.createObjectURL(audioBlob);
      
      // 清理旧的blob URL
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      
      setBlobUrl(newBlobUrl);
    } catch (error) {
      const errorStr = String(error);
      const errorMessage = error instanceof Error ? error.message : '音频加载失败';
      
      // 简单检测：包含音频+没有/404 = 静默处理
      if (errorStr.includes('音频') && (
          errorStr.includes('没有') || 
          errorStr.includes('不存在') || 
          errorStr.includes('404') ||
          errorStr.includes('No audio')
        )) {
        console.log('🔇 没有音频，静默处理');
        setError('该评估暂无音频资源');
        onError?.('该评估暂无音频资源');
      } else {
        console.error('音频加载失败:', error);
        setError(errorMessage);
        onError?.(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // 当evaluationId改变时自动加载音频
  useEffect(() => {
    if (evaluationId) {
      loadAudio(evaluationId);
    }
    
    return () => {
      // 清理blob URL
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [evaluationId]);

  // 音频播放结束后清理blob URL (按照文档建议的内存管理)
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && blobUrl) {
      const handleEnded = () => {
        URL.revokeObjectURL(blobUrl);
      };
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, [blobUrl]);

  const togglePlay = () => {
    if (!audioRef.current || (!blobUrl && !audioUrl)) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('播放失败:', error);
        onError?.('音频播放失败，请重试');
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!evaluationId && !audioUrl) {
    return (
      <div className={cn("flex items-center justify-center w-full", className)}>
        <div className="w-8 h-8 flex items-center justify-center">
          <i className="fa-solid fa-volume-xmark text-gray-400 text-sm" title="无音频"></i>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center w-full", className)}>
        <div className="w-8 h-8 flex items-center justify-center">
          <i className="fa-solid fa-spinner fa-spin text-blue-500 text-sm" title="音频加载中..."></i>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center w-full", className)} title={error}>
        <div className="w-8 h-8 flex items-center justify-center">
          <i className="fa-solid fa-exclamation-triangle text-red-500 text-sm"></i>
        </div>
      </div>
    );
  }

  // 如果没有音频加载或者时长为0，只显示播放按钮
  if (duration === 0) {
    return (
      <div className={cn("flex items-center justify-center w-full", className)}>
        <div className="w-8 h-8 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="relative w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-colors"
            title="播放音频"
          >
            <i className="fa-solid fa-play text-sm absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{marginLeft: '1px', marginTop: '-1px'}}></i>
          </button>
        </div>
        
        <audio
          ref={audioRef}
          src={blobUrl || audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          preload="metadata"
        />
      </div>
    );
  }

  // 计算进度百分比
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const circumference = 2 * Math.PI * 12; // 半径12的圆周长
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <div className={cn("flex items-center justify-center w-full", className)}>
      <div className="relative w-8 h-8 flex items-center justify-center">
        {/* 背景圆圈 */}
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 28 28">
          <circle
            cx="14"
            cy="14"
            r="12"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
          />
          {/* 进度圆圈 */}
          <circle
            cx="14"
            cy="14"
            r="12"
            fill="none"
            stroke={isPlaying ? "#ef4444" : "#3b82f6"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
          />
        </svg>
        
        {/* 中心内容 */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isPlaying ? (
            <>
              <button
                onClick={togglePlay}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500 hover:text-red-600 transition-colors"
                title="暂停"
                style={{marginTop: '-3px'}}
              >
                <i className="fa-solid fa-pause text-[10px]"></i>
              </button>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[6px] text-gray-500 leading-none" style={{marginTop: '6px'}}>
                {Math.ceil(duration - currentTime)}s
              </div>
            </>
          ) : (
            <button
              onClick={togglePlay}
              className="relative w-4 h-4 text-blue-600 hover:text-blue-800 transition-colors"
              title="播放"
            >
              <i className="fa-solid fa-play text-[10px] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{marginLeft: '0.5px', marginTop: '-0.5px'}}></i>
            </button>
          )}
        </div>
      </div>
      
      <audio
        ref={audioRef}
        src={blobUrl || audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
    </div>
  );
}
