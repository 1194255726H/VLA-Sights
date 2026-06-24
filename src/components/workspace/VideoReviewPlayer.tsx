import { Select, Slider, Space, Button } from 'antd';
import { PauseCircleOutlined, PlayCircleOutlined, StepForwardOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import type { VideoEvent } from '../../types/domain';
import { formatTime } from '../../utils/time';

interface VideoReviewPlayerProps {
  url?: string;
  selectedEvent?: VideoEvent;
  seekRequestId: number;
}

export function VideoReviewPlayer({ url, selectedEvent, seekRequestId }: VideoReviewPlayerProps) {
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [duration, setDuration] = useState(60);
  const [playbackRate, setPlaybackRate] = useState(1);

  const selectedStartSeconds = selectedEvent ? selectedEvent.start_time_ms / 1000 : 0;

  useEffect(() => {
    if (selectedEvent && playerRef.current) {
      playerRef.current.currentTime = selectedStartSeconds;
      setPlayedSeconds(selectedStartSeconds);
      setPlaying(true);
    }
  }, [seekRequestId, selectedEvent?.id, selectedStartSeconds]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const seekTo = (value: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = value;
    }
    setPlayedSeconds(value);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-slate-950">
      <div className="min-h-0 flex-1 bg-black">
        {url ? (
          <ReactPlayer
            ref={playerRef}
            src={url}
            playing={playing}
            playbackRate={playbackRate}
            width="100%"
            height="100%"
            controls={false}
            onTimeUpdate={() => setPlayedSeconds(playerRef.current?.currentTime ?? 0)}
            onDurationChange={() => setDuration(playerRef.current?.duration || 60)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">选择任务后加载视频播放 URL</div>
        )}
      </div>
      <div className="shrink-0 border-t border-slate-800 bg-slate-950 px-4 py-3 text-white">
        <div className="flex items-center gap-4">
          <Button
            shape="circle"
            type="text"
            className="text-white hover:!bg-slate-800 hover:!text-white"
            icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => setPlaying((value) => !value)}
            disabled={!url}
          />
          <div className="w-[110px] font-mono text-xs text-slate-300">
            {formatTime(playedSeconds)} / {formatTime(duration)}
          </div>
          <Slider
            className="min-w-0 flex-1"
            min={0}
            max={Math.max(1, duration)}
            step={0.1}
            value={Math.min(playedSeconds, duration)}
            tooltip={{ formatter: (value) => formatTime(value ?? 0) }}
            onChange={seekTo}
            disabled={!url}
          />
          <Space size={8}>
            <Select
              size="small"
              value={playbackRate}
              className="w-[82px]"
              options={[0.5, 1, 1.25, 1.5, 2].map((value) => ({ value, label: `${value}x` }))}
              onChange={setPlaybackRate}
              disabled={!url}
            />
            <Button size="small" icon={<StepForwardOutlined />} onClick={() => selectedEvent && seekTo(selectedStartSeconds)} disabled={!selectedEvent}>
              跳转
            </Button>
          </Space>
        </div>
      </div>
    </section>
  );
}
