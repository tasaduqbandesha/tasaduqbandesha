"use client";

import { useEffect, useRef, useState } from "react";

interface SocialVideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  poster?: string;
  enableAds?: boolean;
  adTagUrl?: string;
}

export default function SocialVideoPlayer({
  src,
  autoPlay = true,
  poster,
  enableAds = false,
  adTagUrl,
}: SocialVideoPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const blurVideoRef = useRef<HTMLVideoElement | null>(null);
  const fullscreenModalRef = useRef<HTMLDivElement | null>(null);
  const fullscreenVideoRef = useRef<HTMLVideoElement | null>(null);
  
  const [hasInteracted, setHasInteracted] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'portrait' | 'landscape' | 'square'>('square');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Store event listeners cleanup functions
  const eventListenersRef = useRef<(() => void)[]>([]);

  // Initialize player when component comes into view
  const initializePlayer = () => {
    if (!wrapperRef.current) return;

    const container = wrapperRef.current.querySelector('.video-container');
    if (!container) return;

    // Clean up existing event listeners
    eventListenersRef.current.forEach(cleanup => cleanup());
    eventListenersRef.current = [];

    // Clear existing videos
    container.innerHTML = '';

    // Create main video first
    const mainVideo = document.createElement("video");
    mainVideo.className = "relative z-10 max-w-full max-h-full";
    mainVideo.setAttribute("playsinline", "true");
    mainVideo.setAttribute("muted", "true");
    mainVideo.setAttribute("preload", "metadata");
    mainVideo.src = src;
    if (poster) mainVideo.poster = poster;

    // Create blur background video - share the same source to optimize loading
    const blurVideo = document.createElement("video");
    blurVideo.className = "absolute inset-0 w-full h-full object-cover opacity-50";
    blurVideo.style.filter = "blur(25px)";
    blurVideo.style.transform = "scale(1.2)";
    blurVideo.setAttribute("playsinline", "true");
    blurVideo.setAttribute("muted", "true");
    blurVideo.setAttribute("preload", "none"); // Don't preload blur video to save bandwidth
    // Don't set src immediately - we'll sync it with main video after it loads

    container.appendChild(blurVideo);
    container.appendChild(mainVideo);

    mainVideoRef.current = mainVideo;
    blurVideoRef.current = blurVideo;

    // Event listeners for main video with cleanup tracking
    const handleLoadedMetadata = () => {
      const { videoWidth, videoHeight } = mainVideo;
      const ratio = videoWidth / videoHeight;
      
      if (ratio < 0.8) {
        setAspectRatio('portrait');
        mainVideo.style.height = "100%";
        mainVideo.style.width = "auto";
        mainVideo.style.objectFit = "contain";
      } else if (ratio > 1.3) {
        setAspectRatio('landscape');
        mainVideo.style.width = "100%";
        mainVideo.style.height = "auto";
        mainVideo.style.objectFit = "contain";
      } else {
        setAspectRatio('square');
        mainVideo.style.width = "100%";
        mainVideo.style.height = "100%";
        mainVideo.style.objectFit = "contain";
      }
      
      setDuration(mainVideo.duration);
      setIsLoading(false);
      
      // Now that main video is loaded, set blur video source for better performance
      if (blurVideo && !blurVideo.src) {
        blurVideo.src = src;
        if (poster) blurVideo.poster = poster;
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(mainVideo.currentTime);
      // Sync blur video
      if (blurVideo && Math.abs(blurVideo.currentTime - mainVideo.currentTime) > 0.5) {
        blurVideo.currentTime = mainVideo.currentTime;
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      blurVideo.play().catch(() => {});
    };

    const handlePause = () => {
      setIsPlaying(false);
      blurVideo.pause();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      blurVideo.pause();
    };

    const handleVolumeChange = () => {
      setVolume(mainVideo.volume);
      setIsMuted(mainVideo.muted);
    };

    // Add event listeners
    mainVideo.addEventListener('loadedmetadata', handleLoadedMetadata);
    mainVideo.addEventListener('timeupdate', handleTimeUpdate);
    mainVideo.addEventListener('play', handlePlay);
    mainVideo.addEventListener('pause', handlePause);
    mainVideo.addEventListener('ended', handleEnded);
    mainVideo.addEventListener('volumechange', handleVolumeChange);

    // Store cleanup functions
    eventListenersRef.current.push(
      () => mainVideo.removeEventListener('loadedmetadata', handleLoadedMetadata),
      () => mainVideo.removeEventListener('timeupdate', handleTimeUpdate),
      () => mainVideo.removeEventListener('play', handlePlay),
      () => mainVideo.removeEventListener('pause', handlePause),
      () => mainVideo.removeEventListener('ended', handleEnded),
      () => mainVideo.removeEventListener('volumechange', handleVolumeChange)
    );

    // Auto play if enabled
    if (autoPlay) {
      setTimeout(() => {
        mainVideo.play().catch(() => {
          console.log("Autoplay failed - waiting for user interaction");
        });
      }, 100);
    }
  };

  // Store fullscreen event listeners cleanup functions
  const fullscreenEventListenersRef = useRef<(() => void)[]>([]);

  // Initialize fullscreen player
  const initializeFullscreenPlayer = () => {
    if (!fullscreenModalRef.current) return;

    const container = fullscreenModalRef.current.querySelector('.fullscreen-video-container');
    if (!container) return;

    // Clean up existing fullscreen event listeners
    fullscreenEventListenersRef.current.forEach(cleanup => cleanup());
    fullscreenEventListenersRef.current = [];

    container.innerHTML = '';

    // Create main fullscreen video first
    const mainVideo = document.createElement("video");
    mainVideo.className = "relative z-10 max-w-full max-h-full";
    mainVideo.setAttribute("playsinline", "true");
    mainVideo.setAttribute("controls", "true");
    mainVideo.src = src;

    // Create blur background for fullscreen - optimize loading
    const blurVideo = document.createElement("video");
    blurVideo.className = "absolute inset-0 w-full h-full object-cover opacity-30";
    blurVideo.style.filter = "blur(30px)";
    blurVideo.style.transform = "scale(1.1)";
    blurVideo.setAttribute("playsinline", "true");
    blurVideo.setAttribute("muted", "true");
    blurVideo.setAttribute("preload", "none"); // Don't preload to save bandwidth
    // Set source after a delay to allow main video to load first
    setTimeout(() => {
      if (blurVideo && !blurVideo.src) {
        blurVideo.src = src;
      }
    }, 500);
    
    // Sync time, volume, and muted state properly
    mainVideo.currentTime = currentTime;
    mainVideo.muted = isMuted;
    mainVideo.volume = volume;

    // Set video styles based on aspect ratio
    if (aspectRatio === 'portrait') {
      mainVideo.style.height = "100%";
      mainVideo.style.width = "auto";
      mainVideo.style.maxWidth = "50%";
    } else if (aspectRatio === 'landscape') {
      mainVideo.style.width = "100%";
      mainVideo.style.height = "auto";
      mainVideo.style.maxHeight = "100%";
    } else {
      mainVideo.style.width = "auto";
      mainVideo.style.height = "100%";
      mainVideo.style.maxWidth = "100%";
    }

    container.appendChild(blurVideo);
    container.appendChild(mainVideo);

    // Store reference to fullscreen video
    fullscreenVideoRef.current = mainVideo;

    // Play if original was playing - with better timing
    if (isPlaying) {
      setTimeout(() => {
        mainVideo.play().then(() => {
          blurVideo.play().catch(() => {});
        }).catch((e) => {
          console.log("Fullscreen play failed:", e);
        });
      }, 200);
    }

    // Event handlers for fullscreen video
    const handleFullscreenTimeUpdate = () => {
      setCurrentTime(mainVideo.currentTime);
      // Sync blur video time
      if (blurVideo && Math.abs(blurVideo.currentTime - mainVideo.currentTime) > 0.5) {
        blurVideo.currentTime = mainVideo.currentTime;
      }
    };

    const handleFullscreenPlay = () => {
      setIsPlaying(true);
      blurVideo.play().catch(() => {});
    };

    const handleFullscreenPause = () => {
      setIsPlaying(false);
      blurVideo.pause();
    };

    const handleFullscreenVolumeChange = () => {
      setVolume(mainVideo.volume);
      setIsMuted(mainVideo.muted);
    };

    // Add event listeners
    mainVideo.addEventListener('timeupdate', handleFullscreenTimeUpdate);
    mainVideo.addEventListener('play', handleFullscreenPlay);
    mainVideo.addEventListener('pause', handleFullscreenPause);
    mainVideo.addEventListener('volumechange', handleFullscreenVolumeChange);

    // Store cleanup functions
    fullscreenEventListenersRef.current.push(
      () => mainVideo.removeEventListener('timeupdate', handleFullscreenTimeUpdate),
      () => mainVideo.removeEventListener('play', handleFullscreenPlay),
      () => mainVideo.removeEventListener('pause', handleFullscreenPause),
      () => mainVideo.removeEventListener('volumechange', handleFullscreenVolumeChange)
    );
  };

  // Intersection Observer for viewport visibility
  useEffect(() => {
    if (!wrapperRef.current) return;

    const handleVisibility = ([entry]: IntersectionObserverEntry[]) => {
      const isVisible = entry.isIntersecting;

      if (!hasInteracted && isVisible) {
        setHasInteracted(true);
        initializePlayer();
      } else if (mainVideoRef.current && hasInteracted && !isFullscreen) {
        if (isVisible && autoPlay) {
          mainVideoRef.current.play().catch(() => {});
        } else {
          mainVideoRef.current.pause();
        }
      }
    };

    const observer = new IntersectionObserver(handleVisibility, {
      threshold: 0.3,
    });

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [hasInteracted, autoPlay, isFullscreen]);

  // Initialize fullscreen player when modal opens
  useEffect(() => {
    if (isFullscreen) {
      setTimeout(() => {
        initializeFullscreenPlayer();
      }, 100);
    }
  }, [isFullscreen, currentTime, aspectRatio]);

  // Cleanup event listeners on component unmount
  useEffect(() => {
    return () => {
      // Clean up main video event listeners
      eventListenersRef.current.forEach(cleanup => cleanup());
      // Clean up fullscreen video event listeners
      fullscreenEventListenersRef.current.forEach(cleanup => cleanup());
      // Reset body overflow when component unmounts
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Control functions
  const togglePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!hasInteracted) {
      setHasInteracted(true);
      initializePlayer();
      setTimeout(() => {
        if (mainVideoRef.current) {
          mainVideoRef.current.play();
        }
      }, 200);
      return;
    }

    // Handle fullscreen video
    if (isFullscreen && fullscreenVideoRef.current) {
      if (fullscreenVideoRef.current.paused) {
        fullscreenVideoRef.current.play();
      } else {
        fullscreenVideoRef.current.pause();
      }
      return;
    }

    // Handle main video
    if (mainVideoRef.current && !isFullscreen) {
      if (mainVideoRef.current.paused) {
        mainVideoRef.current.play();
      } else {
        mainVideoRef.current.pause();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    
    if (isFullscreen && fullscreenVideoRef.current) {
      fullscreenVideoRef.current.currentTime = newTime;
    } else if (mainVideoRef.current) {
      mainVideoRef.current.currentTime = newTime;
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isFullscreen && fullscreenVideoRef.current) {
      fullscreenVideoRef.current.muted = !fullscreenVideoRef.current.muted;
    } else if (mainVideoRef.current) {
      mainVideoRef.current.muted = !mainVideoRef.current.muted;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100;
    
    if (isFullscreen && fullscreenVideoRef.current) {
      fullscreenVideoRef.current.volume = newVolume;
      fullscreenVideoRef.current.muted = newVolume === 0;
    } else if (mainVideoRef.current) {
      mainVideoRef.current.volume = newVolume;
      mainVideoRef.current.muted = newVolume === 0;
    }
  };

  const openFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Pause main video before opening fullscreen
    if (mainVideoRef.current && !mainVideoRef.current.paused) {
      mainVideoRef.current.pause();
    }
    
    setIsFullscreen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    document.body.style.overflow = 'unset';
    
    // Sync back to original video
    if (mainVideoRef.current && fullscreenVideoRef.current) {
      mainVideoRef.current.currentTime = fullscreenVideoRef.current.currentTime;
      mainVideoRef.current.volume = fullscreenVideoRef.current.volume;
      mainVideoRef.current.muted = fullscreenVideoRef.current.muted;
      
      setCurrentTime(fullscreenVideoRef.current.currentTime);
      setVolume(fullscreenVideoRef.current.volume);
      setIsMuted(fullscreenVideoRef.current.muted);
      
      if (!fullscreenVideoRef.current.paused) {
        mainVideoRef.current.play();
      } else {
        mainVideoRef.current.pause();
      }
    }
    
    // Clear fullscreen video reference
    fullscreenVideoRef.current = null;
  };

  const formatTime = (seconds: number) => {
    // Handle invalid input: NaN, Infinity, negative numbers, or undefined
    if (!seconds || !isFinite(seconds) || seconds < 0) {
      return "0:00";
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    // Handle edge case where calculation results in NaN
    if (!isFinite(mins) || !isFinite(secs)) {
      return "0:00";
    }
    
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Main Video Player */}
      <div 
        ref={wrapperRef} 
        className="relative w-full max-w-2xl mx-auto bg-black rounded-xl overflow-hidden shadow-2xl"
        style={{ aspectRatio: '16/9' }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => {
          setShowControls(false);
          setShowVolumeSlider(false);
        }}
        onClick={togglePlay}
      >
        {/* Video Container */}
        <div className="video-container absolute inset-0 flex items-center justify-center bg-black">
          {/* Videos will be inserted here */}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 z-20">
            <div className="text-center text-white">
              <div className="w-12 h-12 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm opacity-80">Loading video...</p>
            </div>
          </div>
        )}

        {/* Initial Play Button */}
        {!hasInteracted && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="bg-black bg-opacity-60 rounded-full p-6 hover:bg-opacity-80 transition-all duration-200 hover:scale-110">
              <svg className="w-16 h-16 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}

        {/* Center Play/Pause Button */}
        {hasInteracted && !showControls && (
          <div className="absolute inset-0 flex items-center justify-center z-15 pointer-events-none">
            <div className={`bg-black bg-opacity-50 rounded-full p-4 transition-opacity duration-300 ${
              isPlaying ? 'opacity-0' : 'opacity-100'
            }`}>
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}

        {/* Video Controls */}
        {hasInteracted && (showControls || !isPlaying) && !isFullscreen && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 z-30">
            {/* Progress Bar */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max="100"
                value={duration && isFinite(duration) && duration > 0 ? (currentTime / duration) * 100 : 0}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-blue-400 transition-colors p-1"
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                {/* Volume Control */}
                <div 
                  className="relative flex items-center"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-blue-400 transition-colors p-1"
                  >
                    {isMuted || volume === 0 ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.029 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.029l4.354-3.793a1 1 0 011-.131zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    ) : volume < 0.5 ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.029 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.029l4.354-3.793a1 1 0 011-.131zM12 8a1 1 0 011 1v2a1 1 0 11-2 0V9a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.029 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.029l4.354-3.793a1 1 0 011-.131zM12 8a1 1 0 011 1v2a1 1 0 11-2 0V9a1 1 0 011-1zm3-1a1 1 0 011 1v4a1 1 0 11-2 0V8a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  {/* Volume Slider */}
                  {showVolumeSlider && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black bg-opacity-90 rounded-lg p-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume * 100}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>

                {/* Time Display */}
                <div className="text-white text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Aspect Ratio Badge */}
                <div className="text-xs">
                  {aspectRatio === 'portrait' && (
                    <span className="bg-blue-600 text-white px-2 py-1 rounded-full">9:16</span>
                  )}
                  {aspectRatio === 'landscape' && (
                    <span className="bg-green-600 text-white px-2 py-1 rounded-full">16:9</span>
                  )}
                  {aspectRatio === 'square' && (
                    <span className="bg-purple-600 text-white px-2 py-1 rounded-full">1:1</span>
                  )}
                </div>

                {/* Fullscreen */}
                <button
                  onClick={openFullscreen}
                  className="text-white hover:text-blue-400 transition-colors p-1"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 000 2h1.586L2.293 8.293a1 1 0 101.414 1.414L6 7.414V9a1 1 0 102 0V4a1 1 0 00-1-1H3zm9 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L14.586 5H12a1 1 0 01-1-1zM3 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H3a1 1 0 01-1-1v-4zm2 1v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4a1 1 0 011-1h1zm10-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L17 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Styles */}
        <style jsx>{`
          .slider {
            background: linear-gradient(to right, #3b82f6 0%, #3b82f6 ${duration && isFinite(duration) && duration > 0 ? (currentTime / duration) * 100 : 0}%, #4b5563 ${duration && isFinite(duration) && duration > 0 ? (currentTime / duration) * 100 : 0}%, #4b5563 100%);
          }
          
          .slider::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          }
          
          .slider::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          }
        `}</style>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          ref={fullscreenModalRef}
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
          style={{ zIndex: 9999 }}
        >
          {/* Fullscreen Video Container */}
          <div className="fullscreen-video-container relative w-full h-full flex items-center justify-center">
            {/* Videos will be inserted here */}
          </div>

          {/* Fullscreen Controls */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-6 z-[10000]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-white text-lg font-semibold">Fullscreen Video</h3>
                <div className="text-xs">
                  {aspectRatio === 'portrait' && (
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full">Portrait</span>
                  )}
                  {aspectRatio === 'landscape' && (
                    <span className="bg-green-600 text-white px-3 py-1 rounded-full">Landscape</span>
                  )}
                  {aspectRatio === 'square' && (
                    <span className="bg-purple-600 text-white px-3 py-1 rounded-full">Square</span>
                  )}
                </div>
              </div>
              
              {/* Close Button */}
              <button
                onClick={closeFullscreen}
                className=" bg-black bg-opacity-70 hover:bg-opacity-90 text-white rounded-full p-2 transition-all duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Custom Fullscreen Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 z-[10000]">
            {/* Progress Bar for Fullscreen */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max="100"
                value={duration && isFinite(duration) && duration > 0 ? (currentTime / duration) * 100 : 0}
                onChange={handleSeek}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer fullscreen-slider"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                {/* Play/Pause Button */}
                <button
                  onClick={togglePlay}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 transition-all duration-200"
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                {/* Volume Control for Fullscreen */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-blue-400 transition-colors p-2"
                  >
                    {isMuted || volume === 0 ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.029 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.029l4.354-3.793a1 1 0 011-.131zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    ) : volume < 0.5 ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.029 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.029l4.354-3.793a1 1 0 011-.131zM12 8a1 1 0 011 1v2a1 1 0 11-2 0V9a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.029 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.029l4.354-3.793a1 1 0 011-.131zM12 8a1 1 0 011 1v2a1 1 0 11-2 0V9a1 1 0 011-1zm3-1a1 1 0 011 1v4a1 1 0 11-2 0V8a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume * 100}
                    onChange={handleVolumeChange}
                    className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="text-white text-sm font-mono bg-black/50 px-3 py-1 rounded-full">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
                <div className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                  {isPlaying ? 'Playing' : 'Paused'}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Exit Fullscreen Button */}
                <button
                  onClick={closeFullscreen}
                  className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-4 py-2 transition-all duration-200 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span>Exit</span>
                </button>
              </div>
            </div>
          </div>

          {/* Additional Styles for Fullscreen */}
          <style jsx>{`
            .fullscreen-slider {
              background: linear-gradient(to right, #3b82f6 0%, #3b82f6 ${duration && isFinite(duration) && duration > 0 ? (currentTime / duration) * 100 : 0}%, #4b5563 ${duration && isFinite(duration) && duration > 0 ? (currentTime / duration) * 100 : 0}%, #4b5563 100%);
            }
            
            .fullscreen-slider::-webkit-slider-thumb {
              appearance: none;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #3b82f6;
              cursor: pointer;
              border: 3px solid #ffffff;
              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
            }
            
            .fullscreen-slider::-moz-range-thumb {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #3b82f6;
              cursor: pointer;
              border: 3px solid #ffffff;
              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
            }
          `}</style>
        </div>
      )}
    </>
  );
}