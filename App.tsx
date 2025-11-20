import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ClothingItem, AppStep, UserImage, SelectedOutfit, SavedLook, FitAnalysis, SavedMeasurement, Page } from './types';
import { CLOTHING_ITEMS } from './constants';
import { generateOutfit, generateClothingItem, customizeOutfit, generateMeasurements } from './services/geminiService';
import { fileToBase64, dataUrlToParts } from './utils/imageHelpers';

// --- Reusable Components ---
const ImageWithLoader = ({ src, alt, className }: { src: string, alt: string, className: string }) => {
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        setIsLoading(true);
    }, [src]);

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="w-8 h-8 border-2 border-t-white border-gray-600 rounded-full animate-spin"></div>
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setIsLoading(false)}
            />
        </div>
    );
};

const OutfitThumbnails: React.FC<{ outfit: SelectedOutfit }> = ({ outfit }) => {
    const items = Object.values(outfit).filter((item): item is ClothingItem => item !== null);
    if (items.length === 0) return <p className="text-gray-500 text-xs italic">No items selected</p>;
    
    return (
        <div className="grid grid-cols-4 gap-2">
             {items.map(item => (
                <div key={item.id} className="flex flex-col gap-1 group/item relative transition-transform hover:scale-105 duration-300">
                     <div className="aspect-square w-full rounded-md overflow-hidden border border-gray-600 bg-gray-900/50">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                     </div>
                     <p className="text-[10px] text-gray-400 truncate" title={item.name}>{item.name}</p>
                </div>
             ))}
        </div>
    );
};

// --- Helper Functions ---
const formatMeasurement = (value: string): string => {
    const v = value.trim();
    if (/^[\d\.\-]+$/.test(v)) {
        return `${v} inches`;
    }
    return v;
};


// --- Icon Components ---
const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);
const SparklesIcon = ({ className = "h-6 w-6 mr-2" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m1-12l1.414-1.414a2 2 0 012.828 0L15 5m0 0l1.414 1.414a2 2 0 010 2.828L15 11m-4 4l-1.414 1.414a2 2 0 01-2.828 0L5 15m0 0l-1.414-1.414a2 2 0 010-2.828L5 9m6 6l1.414-1.414a2 2 0 000-2.828L13 9m-2-2l-1.414 1.414a2 2 0 000 2.828L11 13" />
  </svg>
);
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
const BookmarkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
);
const CollectionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H5a2 2 0 00-2 2v2m14 0h-2M5 11H3" />
    </svg>
);
const RulerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16M8 4v4m8-4v4M8 12v4m8-4v4m-5 4H9m6-12h-2m-4 0H9" />
    </svg>
);
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

// --- Step Components (for TryOnStudio) ---
interface WebcamCaptureProps {
  onImageCaptured: (userImage: UserImage) => void;
  onImageUploaded: (file: File) => void;
}
const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onImageCaptured, onImageUploaded }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const enumerateDevices = useCallback(async () => {
    try {
        await navigator.mediaDevices.getUserMedia({ video: true }); // Request permission
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0) {
            setSelectedDeviceId(videoInputs[0].deviceId);
        }
    } catch(err) {
        console.error("Error enumerating devices:", err);
        setError("Could not access camera. Please grant permission.");
    }
  }, []);

  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  useEffect(() => {
    if (!selectedDeviceId) return;

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    const startStream = async () => {
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: selectedDeviceId } }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
            setStream(newStream);
            setError(null);
        } catch (err) {
            console.error("Error starting stream for device:", selectedDeviceId, err);
            setError("Could not access the selected camera. It may be in use or unavailable.");
        }
    };
    
    startStream();

    return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId]);

  const handleCapture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/jpeg');
      const { base64, mimeType } = dataUrlToParts(dataUrl);
      onImageCaptured({ base64, mimeType, url: dataUrl });
    }
  }, [onImageCaptured]);

  const startCountdown = () => {
    if (!stream || isCountingDown) return;
    setIsCountingDown(true);
    setCountdown(10);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          setIsCountingDown(false);
          setTimeout(() => handleCapture(), 100); 
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);


  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center p-8 glass-panel rounded-2xl animate-slide-up">
      <h2 className="font-heading uppercase tracking-widest text-2xl md:text-3xl font-bold text-center mb-4">Step 1: Capture Your Canvas</h2>
      <p className="text-gray-400 text-center mb-6">Frame yourself in good light. A clear photo works best.</p>
      <div className="w-full aspect-w-4 aspect-h-3 bg-gray-900 rounded-xl overflow-hidden shadow-2xl mb-4 relative border border-gray-600">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        {error && <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 text-center text-red-400">{error}</div>}
      </div>
      {videoDevices.length > 1 && (
        <div className="w-full mb-4">
            <select
                value={selectedDeviceId}
                onChange={e => setSelectedDeviceId(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-white text-white transition-all hover:border-gray-400"
            >
                {videoDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${index + 1}`}
                    </option>
                ))}
            </select>
        </div>
      )}
      <button
        onClick={startCountdown}
        disabled={!stream || isCountingDown}
        className="w-full md:w-auto flex items-center justify-center bg-white hover:bg-gray-200 text-black font-bold py-3 px-8 rounded-full transition-all duration-300 text-lg mb-4 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed shadow-lg hover:scale-105"
      >
        <CameraIcon /> {isCountingDown ? `Capturing in ${countdown}...` : 'Capture Photo'}
      </button>
      <p className="text-gray-500 my-2">or</p>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full md:w-auto flex items-center justify-center border border-gray-500 hover:border-white hover:bg-white/10 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 text-lg hover:scale-105"
      >
        <UploadIcon /> Upload a Photo
      </button>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && onImageUploaded(e.target.files[0])}
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

interface HeightInputViewProps {
    userImage: UserImage;
    onHeightSubmit: (height: string) => void;
    onBack: () => void;
}
const HeightInputView: React.FC<HeightInputViewProps> = ({ userImage, onHeightSubmit, onBack }) => {
    const [feet, setFeet] = useState('5');
    const [inches, setInches] = useState('9');

    const handleSubmit = () => {
        if (feet && inches && !isNaN(parseInt(feet)) && !isNaN(parseInt(inches))) {
            onHeightSubmit(`${feet}'${inches}"`);
        }
    };

    const isFormValid = feet.trim() !== '' && inches.trim() !== '' && parseInt(feet) >= 3 && parseInt(inches) >= 0 && parseInt(inches) < 12;

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center p-8 glass-panel rounded-2xl animate-slide-up">
            <h2 className="font-heading uppercase tracking-widest text-2xl md:text-3xl font-bold text-center mb-4">Step 2: Provide Your Height</h2>
            <p className="text-gray-400 text-center mb-6">This helps our AI tailor create more accurate measurements for you.</p>
            <div className="flex flex-col md:flex-row gap-8 w-full items-center">
                <div className="md:w-1/2 flex flex-col items-center">
                     <ImageWithLoader src={userImage.url} alt="User" className="rounded-lg shadow-2xl w-full max-w-sm border border-gray-600 transform rotate-1 hover:rotate-0 transition-transform duration-500" />
                     <button onClick={onBack} className="mt-4 text-gray-400 hover:text-white transition-colors underline decoration-gray-600 hover:decoration-white underline-offset-4">Retake Photo</button>
                </div>
                <div className="md:w-1/2 flex flex-col items-center justify-center">
                    <div className="space-y-6 w-full max-w-xs text-center">
                        <label className="text-lg font-semibold text-gray-300 uppercase tracking-wider">Your Height</label>
                        <div className="flex items-stretch gap-4">
                            <div className="relative flex-1 group">
                                <input 
                                    type="number" 
                                    value={feet} 
                                    onChange={(e) => setFeet(e.target.value)} 
                                    className="w-full p-4 bg-gray-800/80 border border-gray-600 rounded-xl text-white text-3xl text-center focus:outline-none focus:ring-2 focus:ring-white focus:bg-gray-700 transition-all"
                                    min="3" max="8"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">ft</span>
                            </div>
                            <div className="relative flex-1 group">
                                 <input 
                                    type="number" 
                                    value={inches} 
                                    onChange={(e) => setInches(e.target.value)} 
                                    className="w-full p-4 bg-gray-800/80 border border-gray-600 rounded-xl text-white text-3xl text-center focus:outline-none focus:ring-2 focus:ring-white focus:bg-gray-700 transition-all"
                                    min="0" max="11"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">in</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid}
                        className="mt-8 w-full max-w-xs flex items-center justify-center bg-white hover:bg-gray-200 text-black font-bold py-4 px-8 rounded-full transition-all duration-300 text-xl disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed shadow-lg hover:scale-105"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

interface ClothingSelectionProps {
    onGenerate: (outfit: SelectedOutfit) => void;
    onBack: () => void;
    clothingItems: ClothingItem[];
    selectedOutfit: SelectedOutfit;
    onSelectClothing: (item: ClothingItem) => void;
    onOpenCreateModal: (type: ClothingItem['type']) => void;
    previewImage: string;
    isPreviewLoading: boolean;
}
const ClothingSelection: React.FC<ClothingSelectionProps> = ({ onGenerate, onBack, clothingItems, selectedOutfit, onSelectClothing, onOpenCreateModal, previewImage, isPreviewLoading }) => {
    const clothingByType = useMemo(() => {
        return clothingItems.reduce((acc, item) => {
            if (!acc[item.type]) {
                acc[item.type] = [];
            }
            acc[item.type].push(item);
            return acc;
        }, {} as Record<ClothingItem['type'], ClothingItem[]>);
    }, [clothingItems]);

    const hasSelection = Object.values(selectedOutfit).some(item => item !== null);

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col p-6 glass-panel rounded-2xl animate-slide-up">
            <h2 className="font-heading uppercase tracking-widest text-2xl md:text-3xl font-bold text-center mb-6">Step 3: Curate Your Look</h2>
            <div className="flex flex-col lg:flex-row gap-10">
                <div className="lg:w-1/3 flex flex-col items-center">
                    <h3 className="text-xl font-semibold mb-4 text-gray-300 uppercase tracking-wider">Your Preview</h3>
                     <div className="relative w-full max-w-sm group">
                        <ImageWithLoader src={previewImage} alt="User Preview" className="rounded-lg shadow-2xl w-full border border-gray-600 transition-transform duration-500 group-hover:scale-[1.02]" />
                        {isPreviewLoading && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg transition-all duration-300">
                                <div className="w-12 h-12 border-4 border-t-white border-gray-800 rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                    <button onClick={onBack} className="mt-4 text-gray-400 hover:text-white transition-colors underline decoration-gray-600 hover:decoration-white underline-offset-4">Change Photo/Height</button>
                </div>
                <div className="lg:w-2/3">
                    <div className="space-y-8">
                        {(['Top', 'Pants', 'Shoes', 'Accessory'] as const).map(type => (
                            <div key={type}>
                                <div className="flex justify-between items-center mb-4 border-b border-gray-700/50 pb-2">
                                    <h3 className="text-xl font-semibold text-gray-200">{type}s</h3>
                                    <button onClick={() => onOpenCreateModal(type)} className="flex items-center text-sm font-semibold text-gray-400 hover:text-white transition-all hover:scale-105">
                                        <SparklesIcon className="h-5 w-5 mr-1" /> Create with AI
                                    </button>
                                </div>
                                {(!clothingByType[type] || clothingByType[type].length === 0) ? (
                                    <p className="text-gray-500 italic text-sm">No items available in this category.</p>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {clothingByType[type]?.map(item => {
                                            const isSelected = selectedOutfit[item.type]?.id === item.id;
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => onSelectClothing(item)}
                                                    className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-500 ease-out relative group shadow-lg
                                                        ${isSelected 
                                                            ? 'border-white scale-105 shadow-[0_0_25px_rgba(255,255,255,0.4)]' 
                                                            : 'border-transparent hover:border-white/30 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] bg-gray-900/40'
                                                        }`}
                                                >
                                                    <ImageWithLoader src={item.imageUrl} alt={item.name} className="w-full h-auto object-cover aspect-square" />
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-6 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <p className="text-white text-xs font-semibold truncate">{item.name}</p>
                                                    </div>
                                                    {isSelected && <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-12 flex justify-center">
                <button
                    onClick={() => onGenerate(selectedOutfit)}
                    disabled={!hasSelection}
                    className="flex items-center justify-center bg-white hover:bg-gray-200 text-black font-bold py-4 px-12 rounded-full transition-all duration-300 text-xl disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed shadow-xl hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] hover:scale-105"
                >
                    <SparklesIcon /> Analyze Fit
                </button>
            </div>
        </div>
    );
};

const MeasurementsLoadingView: React.FC<{ imageSrc: string }> = ({ imageSrc }) => (
    <div className="relative w-full max-w-2xl mx-auto aspect-[3/4] md:aspect-[4/3] glass-panel rounded-2xl overflow-hidden animate-slide-up flex flex-col items-center justify-center">
        <img 
            src={imageSrc} 
            alt="Analyzing" 
            className="absolute inset-0 w-full h-full object-cover blur-sm opacity-50"
        />
        <div className="absolute inset-0 bg-black/50 z-0"></div>
        
        <div className="relative z-10 flex flex-col items-center p-8 text-center">
            <div className="w-20 h-20 border-4 border-t-white border-gray-600 rounded-full animate-spin mb-8 shadow-2xl"></div>
            <h2 className="font-heading uppercase tracking-widest text-3xl font-bold mb-4 animate-pulse text-white drop-shadow-lg">Analyzing Your Fit...</h2>
            <p className="text-gray-200 text-lg font-medium drop-shadow-md">Our AI tailor is calculating measurements based on your height and proportions.</p>
        </div>
    </div>
);

interface MeasurementsViewProps {
    userImage: UserImage;
    fitAnalysis: FitAnalysis;
    onProceed: () => void;
    onBack: () => void;
    onSave: () => void;
}
const MeasurementsView: React.FC<MeasurementsViewProps> = ({ userImage, fitAnalysis, onProceed, onBack, onSave }) => {
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        onSave();
        setIsSaved(true);
    };

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col p-6 glass-panel rounded-2xl animate-slide-up">
            <h2 className="font-heading uppercase tracking-widest text-2xl md:text-3xl font-bold text-center mb-8">Step 4: Fit Analysis</h2>
            <div className="flex flex-col lg:flex-row gap-10">
                <div className="lg:w-1/3 flex flex-col items-center">
                    <h3 className="text-xl font-semibold mb-4 text-gray-300 uppercase tracking-wider">Your Photo</h3>
                    <ImageWithLoader src={userImage.url} alt="User" className="rounded-lg shadow-2xl w-full max-w-sm border border-gray-600" />
                    <button onClick={onBack} className="mt-4 text-gray-400 hover:text-white transition-colors underline decoration-gray-600 hover:decoration-white underline-offset-4">Change Selection</button>
                </div>
                <div className="lg:w-2/3 space-y-8">
                    <div className="bg-black/20 rounded-xl p-6 border border-gray-700/50 backdrop-blur-sm">
                        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-700 pb-2 flex items-center"><RulerIcon /> Estimated Body Measurements</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            {fitAnalysis.personMeasurements.measurements.map((m, i) => (
                                <div key={m.name} className={`bg-gray-800/60 p-4 rounded-lg text-center border border-gray-700 hover:border-gray-500 transition-colors duration-300 delay-${i * 100} animate-slide-up`}>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{m.name}</p>
                                    <p className="text-white text-2xl font-bold font-mono">{formatMeasurement(m.value)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 bg-gray-900/40 p-5 rounded-lg border-l-4 border-white/80">
                            <p className="text-gray-300 text-sm italic leading-relaxed">"{fitAnalysis.personMeasurements.notes}"</p>
                        </div>
                    </div>
                    <div className="bg-black/20 rounded-xl p-6 border border-gray-700/50 backdrop-blur-sm">
                        <h3 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-700 pb-2">Garment Fit Details</h3>
                        <div className="space-y-6 mt-4">
                            {fitAnalysis.clothingFit.map((item, i) => (
                                <div key={item.itemName} className={`bg-gray-800/60 p-6 rounded-lg border border-gray-700 hover:bg-gray-800/80 transition-colors duration-300 delay-${(i + 3) * 100} animate-slide-up`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold text-lg text-white tracking-wide">{item.itemName}</h4>
                                        <span className="text-[10px] font-bold uppercase bg-white text-black px-2 py-1 rounded-full tracking-wider">{item.itemType}</span>
                                    </div>
                                    <p className="text-gray-300 mb-5 text-sm leading-relaxed border-l-2 border-gray-600 pl-4">"{item.fitDescription}"</p>
                                    
                                    <div className="bg-black/40 p-4 rounded-lg border border-gray-700/50">
                                        <h5 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest">Size M Estimate</h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                                            {item.garmentMeasurements.map(m => (
                                                <div key={m.name} className="flex justify-between items-center border-b border-gray-700/50 border-dashed py-1">
                                                    <span className="text-gray-400">{m.name}</span>
                                                    <span className="text-white font-mono font-semibold">{formatMeasurement(m.value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-12 flex flex-wrap justify-center gap-6">
                 <button
                    onClick={handleSave}
                    disabled={isSaved}
                    className="flex items-center justify-center border border-gray-500 hover:border-white hover:bg-white/10 text-white font-bold py-4 px-8 rounded-full transition-all duration-300 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <BookmarkIcon /> {isSaved ? 'Saved!' : 'Save Measurements'}
                </button>
                <button
                    onClick={onProceed}
                    className="flex items-center justify-center bg-white hover:bg-gray-200 text-black font-bold py-4 px-10 rounded-full transition-all duration-300 text-xl shadow-xl hover:scale-105"
                >
                    <SparklesIcon /> Proceed to Try-On
                </button>
            </div>
        </div>
    );
};

const GenerationView: React.FC<{ imageSrc: string }> = ({ imageSrc }) => (
  <div className="relative w-full max-w-2xl mx-auto aspect-[3/4] md:aspect-[4/3] glass-panel rounded-2xl overflow-hidden animate-slide-up flex flex-col items-center justify-center">
    <img 
        src={imageSrc} 
        alt="Forging" 
        className="absolute inset-0 w-full h-full object-cover blur-sm opacity-50"
    />
    <div className="absolute inset-0 bg-black/50 z-0"></div>

    <div className="relative z-10 flex flex-col items-center p-8 text-center">
        <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-white rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <SparklesIcon className="h-8 w-8 text-white animate-pulse" />
            </div>
        </div>
        <h2 className="font-heading uppercase tracking-widest text-3xl font-bold mb-4 text-white drop-shadow-lg">Forging Your Look...</h2>
        <p className="text-gray-200 text-lg font-medium drop-shadow-md">Our AI is crafting your 1 of One.</p>
    </div>
  </div>
);

interface CustomizeViewProps {
    generatedImage: string;
    selectedOutfit: SelectedOutfit;
    onFinalize: (finalImage: string) => void;
    onBack: () => void;
}
const CustomizeView: React.FC<CustomizeViewProps> = ({ generatedImage, selectedOutfit, onFinalize, onBack }) => {
    const [history, setHistory] = useState<string[]>([generatedImage]);
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentImage = history[history.length - 1];

    const handleCustomize = async (instruction: string) => {
        setIsCustomizing(true);
        setError(null);
        try {
            const imageToModify = history[history.length - 1];
            const dataUrl = `data:image/png;base64,${imageToModify}`;
            const { base64, mimeType } = dataUrlToParts(dataUrl);
            const newImageBase64 = await customizeOutfit({ base64, mimeType, url: dataUrl }, instruction);
            setHistory(prev => [...prev, newImageBase64]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to apply customization.");
        } finally {
            setIsCustomizing(false);
        }
    };

    const handleUndo = () => {
        if (history.length > 1) {
            setHistory(prev => prev.slice(0, -1));
        }
    };

    const handleReset = () => {
        setHistory([generatedImage]);
    };
    
    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center p-6 glass-panel rounded-2xl animate-slide-up">
            <h2 className="font-heading uppercase tracking-widest text-2xl md:text-3xl font-bold text-center mb-6">Step 5: Customize Your Style</h2>
            <div className="flex flex-col lg:flex-row gap-8 w-full">
                <div className="lg:w-2/3 relative group">
                    <ImageWithLoader src={`data:image/png;base64,${currentImage}`} alt="Generated Outfit" className="rounded-lg shadow-2xl w-full border border-gray-600 transition-all duration-500" />
                    {isCustomizing && (
                         <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
                             <div className="flex flex-col items-center">
                                <div className="w-12 h-12 border-4 border-t-white border-gray-700 rounded-full animate-spin mb-4"></div>
                                <p className="text-white font-bold tracking-wider animate-pulse">Modifying...</p>
                             </div>
                        </div>
                    )}
                </div>
                <div className="lg:w-1/3 flex flex-col bg-black/30 p-6 rounded-xl border border-gray-700/50">
                    <h3 className="text-xl font-semibold mb-6 text-gray-200 flex items-center"><SparklesIcon className="h-5 w-5 mr-2" /> Modification Panel</h3>
                    <div className="space-y-8 flex-grow overflow-y-auto custom-scrollbar pr-2">
                        {selectedOutfit.Top && (
                            <div className="animate-slide-up delay-100">
                                <h4 className="font-bold text-sm mb-3 text-white uppercase tracking-widest border-b border-gray-700 pb-1">Top</h4>
                                <div className="mb-4">
                                    <h5 className="text-[10px] text-gray-400 mb-2 uppercase font-bold tracking-wider">Fit & Silhouette</h5>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Baggy Fit', 'Slim Fit', 'Oversized', 'Boxy Fit', 'Cropped'].map(opt => (
                                            <button key={opt} onClick={() => handleCustomize(`Make the top ${opt.toLowerCase()}`)} disabled={isCustomizing} className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md transition-all text-xs text-gray-300 hover:text-white disabled:opacity-50">{opt}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <h5 className="text-[10px] text-gray-400 mb-2 uppercase font-bold tracking-wider">Style</h5>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handleCustomize('Make the top short-sleeved')} disabled={isCustomizing} className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md transition-all text-xs text-gray-300 hover:text-white disabled:opacity-50">Short Sleeve</button>
                                        <button onClick={() => handleCustomize('Make the top into a tank top')} disabled={isCustomizing} className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md transition-all text-xs text-gray-300 hover:text-white disabled:opacity-50">Tank Top</button>
                                        <button onClick={() => handleCustomize('Make the top into a hoodie')} disabled={isCustomizing} className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md transition-all text-xs text-gray-300 hover:text-white disabled:opacity-50">Add Hood</button>
                                    </div>
                                </div>
                                <div>
                                     <h5 className="text-[10px] text-gray-400 mb-2 uppercase font-bold tracking-wider">Color</h5>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handleCustomize('Change the color of the top to black')} disabled={isCustomizing} className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md transition-all text-xs text-gray-300 hover:text-white disabled:opacity-50">Black</button>
                                        <button onClick={() => handleCustomize('Change the color of the top to white')} disabled={isCustomizing} className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md transition-all text-xs text-gray-300 hover:text-white disabled:opacity-50">White</button>
                                    </div>
                                </div>
                            </div>
                        )}
                         {selectedOutfit.Pants && (
                            <div className="animate-slide-up delay-200">
                                <h4 className="font-bold text-sm mb-3 text-white uppercase tracking-widest border-b border-gray-700 pb-1">Pants</h4>
                                 <div className="mb-4">
                                    <h5 className="text-[10px] text-gray-400 mb-2 uppercase font-bold tracking-wider">Fit</h5>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handleCustomize('Make the pants baggy fit')} disabled={isCustomizing} className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md transition-all text-xs text-gray-300 hover:text-white disabled:opacity-50">Baggy Fit</button>
                                        <button onClick={() => handleCustomize('Make the pants skinny fit')} disabled={isCustomizing} className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md transition-all text-xs text-gray-300 hover:text-white disabled:opacity-50">Skinny Fit</button>
                                        <button onClick={() => handleCustomize('Make the pants cropped length')} disabled={isCustomizing} className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md transition-all text-xs text-gray-300 hover:text-white disabled:opacity-50">Cropped</button>
                                    </div>
                                </div>
                                <div>
                                    <h5 className="text-[10px] text-gray-400 mb-2 uppercase font-bold tracking-wider">Style</h5>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handleCustomize('Make the pants into shorts')} disabled={isCustomizing} className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md transition-all text-xs text-gray-300 hover:text-white disabled:opacity-50">Shorts</button>
                                        <button onClick={() => handleCustomize('Add rips to the knees of the pants')} disabled={isCustomizing} className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md transition-all text-xs text-gray-300 hover:text-white disabled:opacity-50">Add Rips</button>
                                        <button onClick={() => handleCustomize('Change the material of the pants to blue denim')} disabled={isCustomizing} className="p-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-md transition-all text-xs text-gray-300 hover:text-white disabled:opacity-50">Make Denim</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {error && <p className="text-red-400 mt-4 text-sm bg-red-900/20 p-2 rounded border border-red-800">{error}</p>}
                     <div className="mt-6 pt-6 border-t border-gray-700 flex flex-col gap-4">
                        <div className="flex gap-3">
                            <button onClick={handleUndo} disabled={isCustomizing || history.length <= 1} className="w-full text-xs uppercase tracking-wider font-bold p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition disabled:opacity-50">Undo</button>
                            <button onClick={handleReset} disabled={isCustomizing || history.length <= 1} className="w-full text-xs uppercase tracking-wider font-bold p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition disabled:opacity-50">Reset</button>
                        </div>
                         <button onClick={() => onFinalize(currentImage)} disabled={isCustomizing} className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 px-6 rounded-full transition text-lg disabled:opacity-50 shadow-lg hover:scale-105">Finalize Look</button>
                         <button onClick={onBack} disabled={isCustomizing} className="w-full text-gray-500 hover:text-white transition-colors disabled:opacity-50 text-sm">Back to Selection</button>
                     </div>
                </div>
            </div>
        </div>
    )
};

interface ResultViewProps {
  originalImage: UserImage;
  finalImage: string;
  onStartOver: () => void;
  onSaveLook: () => void;
}
const ResultView: React.FC<ResultViewProps> = ({ originalImage, finalImage, onStartOver, onSaveLook }) => {
    const [isSaved, setIsSaved] = useState(false);
    
    useEffect(() => {
        setIsSaved(false);
    }, [finalImage]);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${finalImage}`;
        link.download = '1_of_One_Look.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSave = () => {
        onSaveLook();
        setIsSaved(true);
    };

    return (
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center p-6 glass-panel rounded-2xl animate-slide-up">
        <h2 className="font-heading uppercase tracking-widest text-3xl md:text-4xl font-bold text-center mb-10 title-glow">Your 1 of One</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full">
          <div className="flex flex-col items-center group">
            <h3 className="text-xl font-semibold mb-4 uppercase tracking-wider text-gray-400 group-hover:text-white transition-colors">Before</h3>
            <ImageWithLoader src={originalImage.url} alt="Original" className="rounded-lg shadow-2xl w-full border border-gray-600 transform group-hover:scale-[1.02] transition-transform duration-500" />
          </div>
          <div className="flex flex-col items-center group">
            <h3 className="text-xl font-semibold mb-4 uppercase tracking-wider text-white drop-shadow-md">After</h3>
            <ImageWithLoader src={`data:image/png;base64,${finalImage}`} alt="Generated" className="rounded-lg shadow-2xl w-full border-2 border-white transform group-hover:scale-[1.02] transition-transform duration-500" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 mt-16">
            <button
            onClick={onStartOver}
            className="bg-white hover:bg-gray-200 text-black font-bold py-4 px-10 rounded-full transition-all duration-300 text-lg shadow-lg hover:scale-105"
            >
            Start Over
            </button>
            <button
                onClick={handleSave}
                disabled={isSaved}
                className="flex items-center justify-center border border-gray-500 hover:border-white hover:bg-white/10 text-white font-bold py-4 px-10 rounded-full transition-all duration-300 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <BookmarkIcon /> {isSaved ? 'Saved!' : 'Save Look'}
            </button>
            <button
                onClick={handleDownload}
                className="flex items-center justify-center border border-gray-500 hover:border-white hover:bg-white/10 text-white font-bold py-4 px-10 rounded-full transition-all duration-300 text-lg"
            >
                <DownloadIcon /> Download
            </button>
        </div>
      </div>
    );
}

interface GenerateClothingModalProps {
    isOpen: boolean;
    initialType: ClothingItem['type'] | null;
    onClose: () => void;
    onItemCreated: (item: ClothingItem) => void;
}
const GenerateClothingModal: React.FC<GenerateClothingModalProps> = ({ isOpen, initialType, onClose, onItemCreated }) => {
    const [prompt, setPrompt] = useState('');
    const [type, setType] = useState<ClothingItem['type']>('Top');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    useEffect(() => {
        if (initialType) {
            setType(initialType);
        }
    }, [initialType]);
  
    const handleGenerate = async () => {
      if (!prompt.trim()) {
        setError("Please enter a description for your clothing item.");
        return;
      }
      setIsLoading(true);
      setError(null);
      setGeneratedImage(null);
      try {
        const imageBase64 = await generateClothingItem(prompt);
        setGeneratedImage(imageBase64);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    };
  
    const handleUseItem = () => {
      if (!generatedImage) return;
      const newItem: ClothingItem = {
        id: Date.now(),
        name: prompt.length > 20 ? `${prompt.substring(0, 18)}...` : prompt,
        type,
        imageUrl: `data:image/jpeg;base64,${generatedImage}`,
        description: prompt,
      };
      onItemCreated(newItem);
      handleClose();
    };
    
    const handleClose = () => {
      setPrompt('');
      setIsLoading(false);
      setError(null);
      setGeneratedImage(null);
      onClose();
    };
  
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="glass-panel bg-gray-900/90 rounded-2xl shadow-2xl p-8 w-full max-w-lg relative animate-slide-up">
          <button onClick={handleClose} className="absolute top-4 right-4 text-gray-500 hover:text-white text-3xl transition-colors">&times;</button>
          <h2 className="font-heading uppercase tracking-widest text-2xl font-bold text-center mb-4">Create Your Piece</h2>
          
          {!generatedImage && !isLoading && (
            <>
              <p className="text-gray-400 text-center mb-6">Describe the clothing item you want to create.</p>
              <div className="space-y-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., a futuristic silver bomber jacket"
                  className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-white text-white transition-all"
                  rows={3}
                />
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value as ClothingItem['type'])}
                  className="w-full p-4 bg-gray-800 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-white text-white"
                >
                  <option value="Top">Top</option>
                  <option value="Pants">Pants</option>
                  <option value="Shoes">Shoes</option>
                  <option value="Accessory">Accessory</option>
                </select>
              </div>
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full mt-8 flex items-center justify-center bg-white hover:bg-gray-200 text-black font-bold py-4 px-6 rounded-full transition-all duration-300 text-lg disabled:bg-gray-700 disabled:text-gray-500 shadow-lg hover:scale-105"
              >
                <SparklesIcon /> Generate
              </button>
            </>
          )}

          {isLoading && (
             <div className="flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 border-4 border-t-white border-gray-600 rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl font-bold mb-2 animate-pulse">Designing...</h3>
                <p className="text-gray-400">Your custom piece is being tailored.</p>
            </div>
          )}

          {generatedImage && !isLoading && (
            <div className="flex flex-col items-center animate-slide-up">
                <h3 className="text-xl font-semibold mb-4">Your Creation</h3>
                <ImageWithLoader src={`data:image/jpeg;base64,${generatedImage}`} alt="Generated Clothing" className="rounded-lg shadow-2xl w-full max-w-sm mb-8 border border-gray-500" />
                <div className="flex gap-4 w-full">
                    <button onClick={handleGenerate} className="w-full border border-gray-500 hover:border-white text-white font-bold py-3 px-6 rounded-full transition duration-300">Regenerate</button>
                    <button onClick={handleUseItem} className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 px-6 rounded-full transition duration-300 shadow-lg">Use this Piece</button>
                </div>
            </div>
          )}

          {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        </div>
      </div>
    );
};

interface SavedLooksModalProps {
    isOpen: boolean;
    onClose: () => void;
    looks: SavedLook[];
    onDelete: (id: number) => void;
}
const SavedLooksModal: React.FC<SavedLooksModalProps> = ({ isOpen, onClose, looks, onDelete }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-panel bg-gray-900/80 rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-4xl h-[90vh] relative flex flex-col animate-slide-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white text-3xl z-10 transition-colors">&times;</button>
                <h2 className="font-heading uppercase tracking-widest text-2xl font-bold text-center mb-8">My Looks</h2>
                
                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                    {looks.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500">You haven't saved any looks yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {looks.map(look => (
                                <div key={look.id} className="bg-gray-800/60 rounded-xl border border-gray-700 flex flex-col overflow-hidden hover:border-gray-500 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                                    <div className="relative group">
                                        <ImageWithLoader src={`data:image/png;base64,${look.finalImage}`} alt="Saved look" className="w-full h-auto object-cover aspect-[3/4]" />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                                            <button 
                                                onClick={() => onDelete(look.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transform hover:scale-110"
                                                aria-label="Delete look"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-gray-700/50">
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Outfit</p>
                                        <OutfitThumbnails outfit={look.selectedOutfit} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface SavedMeasurementsModalProps {
    isOpen: boolean;
    onClose: () => void;
    measurements: SavedMeasurement[];
    onDelete: (id: number) => void;
}
const SavedMeasurementsModal: React.FC<SavedMeasurementsModalProps> = ({ isOpen, onClose, measurements, onDelete }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-panel bg-gray-900/80 rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-5xl h-[90vh] relative flex flex-col animate-slide-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white text-3xl z-10 transition-colors">&times;</button>
                <h2 className="font-heading uppercase tracking-widest text-2xl font-bold text-center mb-8">My Measurements</h2>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                    {measurements.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500">You haven't saved any measurements yet.</p>
                        </div>
                    ) : (
                        measurements.map(saved => (
                            <div key={saved.id} className="bg-gray-800/60 p-6 rounded-xl border border-gray-700 relative group hover:border-gray-500 transition-all">
                                <button 
                                    onClick={() => onDelete(saved.id)}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full z-10 shadow-lg transform hover:scale-110"
                                    aria-label="Delete measurement"
                                >
                                    <TrashIcon />
                                </button>
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="md:w-1/4">
                                        <ImageWithLoader src={saved.userImage.url} alt="User" className="rounded-lg w-full shadow-md border border-gray-600" />
                                    </div>
                                    <div className="md:w-3/4 flex flex-col gap-5">
                                        <div className="bg-black/30 p-4 rounded-lg border border-gray-700/50">
                                            <h4 className="font-bold text-xs text-gray-400 uppercase mb-3 tracking-widest">Selected Outfit</h4>
                                            <OutfitThumbnails outfit={saved.selectedOutfit} />
                                        </div>
                                        <details className="bg-black/30 rounded-lg p-4 border border-gray-700/50 group/details">
                                            <summary className="font-semibold text-lg cursor-pointer text-gray-300 hover:text-white flex items-center justify-between transition-colors">
                                                <span>Estimated Body Measurements</span>
                                            </summary>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 animate-fade-in">
                                                {saved.fitAnalysis.personMeasurements.measurements.map(m => (
                                                    <div key={m.name} className="bg-gray-800 p-3 rounded-md text-center">
                                                        <p className="text-gray-400 text-xs uppercase tracking-wider">{m.name}</p>
                                                        <p className="text-white text-lg font-bold font-mono">{formatMeasurement(m.value)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-gray-400 text-sm mt-4 italic border-l-2 border-gray-600 pl-3 animate-fade-in">{saved.fitAnalysis.personMeasurements.notes}</p>
                                        </details>
                                        <details className="bg-black/30 rounded-lg p-4 border border-gray-700/50 group/details">
                                            <summary className="font-semibold text-lg cursor-pointer text-gray-300 hover:text-white flex items-center justify-between transition-colors">
                                                <span>Garment Fit Details</span>
                                            </summary>
                                            <div className="space-y-4 mt-4 animate-fade-in">
                                                {saved.fitAnalysis.clothingFit.map(item => (
                                                    <div key={item.itemName} className="bg-gray-800 p-4 rounded-md border border-gray-700">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h4 className="font-bold text-md text-white">{item.itemName}</h4>
                                                            <span className="text-[10px] uppercase bg-white text-black px-2 py-1 rounded font-bold">{item.itemType}</span>
                                                        </div>
                                                        <p className="text-gray-300 text-sm mb-3">"{item.fitDescription}"</p>
                                                        <div className="bg-black/40 p-3 rounded grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                                            {item.garmentMeasurements.map(m => (
                                                                <div key={m.name} className="flex justify-between border-b border-dashed border-gray-700 py-1">
                                                                    <span className="text-gray-400">{m.name}:</span>
                                                                    <span className="text-white font-mono">{formatMeasurement(m.value)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const INITIAL_OUTFIT: SelectedOutfit = { Top: null, Pants: null, Shoes: null, Accessory: null };
const LOOKS_STORAGE_KEY = '1ofone_saved_looks';
const MEASUREMENTS_STORAGE_KEY = '1ofone_saved_measurements';

// --- Page Components ---

const HomePage: React.FC<{ onNavigate: (page: Page) => void }> = ({ onNavigate }) => (
    <div className="w-full flex-grow flex items-center justify-center text-center p-6">
        <div className="relative z-10 max-w-4xl">
            <h1 className="font-heading text-6xl md:text-9xl font-extrabold tracking-tighter text-white uppercase mb-6 animate-slide-up title-glow">
                1 of One
            </h1>
            <p className="text-gray-300 mt-4 text-xl md:text-3xl max-w-2xl mx-auto animate-slide-up delay-100 font-light">
                Where Style Meets Singularity.
            </p>
             <p className="text-gray-400 mt-2 text-lg max-w-2xl mx-auto animate-slide-up delay-200">
                Upload your photo, design unique pieces with AI, and experience a virtual try-on like never before.
            </p>
            <button
                onClick={() => onNavigate('try-on')}
                className="mt-12 bg-white hover:bg-gray-200 text-black font-bold py-5 px-12 rounded-full transition-all duration-300 text-xl uppercase tracking-widest animate-slide-up delay-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] hover:scale-105"
            >
                Enter The Studio
            </button>
        </div>
    </div>
);

const ContactPage: React.FC = () => (
    <div className="w-full max-w-3xl mx-auto flex-grow flex flex-col justify-center p-6 animate-slide-up">
        <h2 className="font-heading uppercase tracking-widest text-3xl md:text-4xl font-bold text-center mb-10">Get in Touch</h2>
        <div className="glass-panel bg-gray-900/60 rounded-2xl p-10 space-y-8">
            <p className="text-center text-gray-300 text-lg">Have a question or want to collaborate? Reach out to us.</p>
            <div className="flex justify-center gap-12 text-center border-b border-gray-700 pb-8">
                <div>
                    <h3 className="font-bold text-lg text-white mb-2 uppercase tracking-wider">Email Us</h3>
                    <a href="mailto:contact@1of.one" className="text-gray-400 hover:text-white transition-colors text-lg">contact@1of.one</a>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-white mb-2 uppercase tracking-wider">Follow Us</h3>
                    <p className="text-gray-400 text-lg">@1ofone_style</p>
                </div>
            </div>
            <form className="space-y-6 pt-2">
                <input type="text" placeholder="Your Name" className="w-full p-4 bg-black/30 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-white text-white transition-all placeholder-gray-500" />
                <input type="email" placeholder="Your Email" className="w-full p-4 bg-black/30 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-white text-white transition-all placeholder-gray-500" />
                <textarea placeholder="Your Message" rows={4} className="w-full p-4 bg-black/30 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-white text-white transition-all placeholder-gray-500"></textarea>
                <button type="submit" disabled className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 px-6 rounded-full transition-all duration-300 text-lg disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed shadow-lg hover:scale-105">
                    Send Message
                </button>
            </form>
        </div>
    </div>
);

// --- TryOnStudio Component ---
const TryOnStudio: React.FC = () => {
  const [step, setStep] = useState<AppStep>('capture');
  const [userImage, setUserImage] = useState<UserImage | null>(null);
  const [userHeight, setUserHeight] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [clothingItems, setClothingItems] = useState<ClothingItem[]>(CLOTHING_ITEMS);
  const [selectedOutfit, setSelectedOutfit] = useState<SelectedOutfit>(INITIAL_OUTFIT);
  const [creatingItemType, setCreatingItemType] = useState<ClothingItem['type'] | null>(null);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
  const [savedMeasurements, setSavedMeasurements] = useState<SavedMeasurement[]>([]);
  const [isLooksModalOpen, setIsLooksModalOpen] = useState(false);
  const [isMeasurementsModalOpen, setIsMeasurementsModalOpen] = useState(false);
  const [fitAnalysis, setFitAnalysis] = useState<FitAnalysis | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
        const storedLooks = localStorage.getItem(LOOKS_STORAGE_KEY);
        if (storedLooks) {
            setSavedLooks(JSON.parse(storedLooks));
        }
        const storedMeasurements = localStorage.getItem(MEASUREMENTS_STORAGE_KEY);
        if (storedMeasurements) {
            setSavedMeasurements(JSON.parse(storedMeasurements));
        }
    } catch (e) {
        console.error("Failed to load saved data from localStorage", e);
    }
  }, []);

  useEffect(() => {
    if (step !== 'select' || !userImage) {
        return;
    }

    if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
    }

    const selectedItems = Object.values(selectedOutfit)
        .filter((item): item is ClothingItem => item !== null);

    if (selectedItems.length === 0) {
        setPreviewImage(userImage.url);
        setIsPreviewLoading(false);
        return;
    }

    debounceTimeout.current = setTimeout(async () => {
        setIsPreviewLoading(true);
        try {
            const resultBase64 = await generateOutfit(userImage, selectedItems);
            setPreviewImage(`data:image/png;base64,${resultBase64}`);
        } catch (err) {
            console.error("Failed to generate preview:", err);
            if (userImage) setPreviewImage(userImage.url);
        } finally {
            setIsPreviewLoading(false);
        }
    }, 800);

    return () => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
    };
  }, [selectedOutfit, userImage, step]);

  const handleImageCaptured = useCallback((capturedImage: UserImage) => {
    setUserImage(capturedImage);
    setStep('height');
  }, []);

  const handleImageUploaded = useCallback(async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);
      const { base64, mimeType } = await fileToBase64(file);
      const url = URL.createObjectURL(file);
      setUserImage({ base64, mimeType, url });
      setStep('height');
    } catch (err) {
      setError("Failed to process the uploaded image.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleHeightSubmitted = (height: string) => {
    setUserHeight(height);
    if (userImage) {
        setPreviewImage(userImage.url);
    }
    setStep('select');
  };

  const handleSelectClothing = (item: ClothingItem) => {
    setSelectedOutfit(prev => ({
        ...prev,
        [item.type]: prev[item.type]?.id === item.id ? null : item
    }));
  };

  const handleProceedToMeasure = useCallback(async (outfit: SelectedOutfit) => {
    if (!userImage) {
      setError("No user image available to generate from.");
      return;
    }
    const selectedItems = Object.values(outfit)
        .filter((item): item is ClothingItem => item !== null);
    
    if (selectedItems.length === 0) {
        setError("Please select at least one clothing item.");
        return;
    }

    setStep('measure');
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateMeasurements(userImage, selectedItems, userHeight);
      setFitAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setStep('select'); // Go back to selection on error
    } finally {
      setIsLoading(false);
    }
  }, [userImage, userHeight]);

  const handleProceedToGenerate = useCallback(async () => {
    if (!userImage) return;
    const selectedItems = Object.values(selectedOutfit)
        .filter((item): item is ClothingItem => item !== null);
    
    setStep('generate');
    setIsLoading(true);
    setError(null);
    try {
      const resultBase64 = await generateOutfit(userImage, selectedItems);
      setGeneratedImage(resultBase64);
      setStep('customize');
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setStep('select'); // Go back to selection on error
    } finally {
      setIsLoading(false);
    }
  }, [userImage, selectedOutfit]);

  const handleFinalize = (finalImage: string) => {
    setGeneratedImage(finalImage);
    setStep('result');
  };

  const handleStartOver = () => {
    setUserImage(null);
    setGeneratedImage(null);
    setError(null);
    setIsLoading(false);
    setStep('capture');
    setSelectedOutfit(INITIAL_OUTFIT);
    setFitAnalysis(null);
    setUserHeight(null);
    setPreviewImage(null);
    setIsPreviewLoading(false);
  };

  const handleItemCreated = (item: ClothingItem) => {
    setClothingItems(prevItems => [item, ...prevItems]);
    handleSelectClothing(item);
  };

  const handleSaveLook = useCallback(() => {
    if (!generatedImage || !userImage) return;
    const newLook: SavedLook = {
        id: Date.now(),
        finalImage: generatedImage,
        originalImage: userImage,
        selectedOutfit: selectedOutfit
    };
    const updatedLooks = [newLook, ...savedLooks];
    setSavedLooks(updatedLooks);
    localStorage.setItem(LOOKS_STORAGE_KEY, JSON.stringify(updatedLooks));
  }, [generatedImage, userImage, selectedOutfit, savedLooks]);

  const handleDeleteLook = (id: number) => {
    const updatedLooks = savedLooks.filter(look => look.id !== id);
    setSavedLooks(updatedLooks);
    localStorage.setItem(LOOKS_STORAGE_KEY, JSON.stringify(updatedLooks));
  };

  const handleSaveMeasurements = useCallback(() => {
    if (!fitAnalysis || !userImage) return;
    const newMeasurement: SavedMeasurement = {
        id: Date.now(),
        fitAnalysis,
        userImage,
        selectedOutfit
    };
    const updatedMeasurements = [newMeasurement, ...savedMeasurements];
    setSavedMeasurements(updatedMeasurements);
    localStorage.setItem(MEASUREMENTS_STORAGE_KEY, JSON.stringify(updatedMeasurements));
  }, [fitAnalysis, userImage, selectedOutfit, savedMeasurements]);

  const handleDeleteMeasurement = (id: number) => {
    const updatedMeasurements = savedMeasurements.filter(m => m.id !== id);
    setSavedMeasurements(updatedMeasurements);
    localStorage.setItem(MEASUREMENTS_STORAGE_KEY, JSON.stringify(updatedMeasurements));
  };

  const renderContent = () => {
    const activeImage = previewImage || userImage?.url || '';
    if (isLoading && (step === 'generate' || step === 'measure')) {
        return step === 'generate' 
            ? <GenerationView imageSrc={activeImage} /> 
            : <MeasurementsLoadingView imageSrc={activeImage} />;
    }
    switch (step) {
      case 'capture':
        return <WebcamCapture onImageCaptured={handleImageCaptured} onImageUploaded={handleImageUploaded} />;
      case 'height':
        if (userImage) {
            return <HeightInputView
                userImage={userImage}
                onHeightSubmit={handleHeightSubmitted}
                onBack={handleStartOver}
            />
        }
        break;
      case 'select':
        if (userImage) {
          return <ClothingSelection 
            previewImage={previewImage || userImage.url}
            isPreviewLoading={isPreviewLoading}
            onGenerate={handleProceedToMeasure} 
            onBack={() => setStep('height')}
            clothingItems={clothingItems}
            selectedOutfit={selectedOutfit}
            onSelectClothing={handleSelectClothing}
            onOpenCreateModal={(type) => setCreatingItemType(type)}
             />;
        }
        break;
      case 'measure':
        if (fitAnalysis && userImage) {
            return <MeasurementsView 
              userImage={userImage}
              fitAnalysis={fitAnalysis}
              onProceed={handleProceedToGenerate}
              onBack={() => setStep('select')}
              onSave={handleSaveMeasurements}
            />
        }
        break; 
      case 'generate':
        return <GenerationView imageSrc={activeImage} />;
      case 'customize':
        if (generatedImage) {
            return <CustomizeView 
                generatedImage={generatedImage} 
                selectedOutfit={selectedOutfit}
                onFinalize={handleFinalize}
                onBack={() => setStep('select')}
                />
        }
        break;
      case 'result':
        if (userImage && generatedImage) {
          return <ResultView originalImage={userImage} finalImage={generatedImage} onStartOver={handleStartOver} onSaveLook={handleSaveLook} />;
        }
        break;
      default:
        return <WebcamCapture onImageCaptured={handleImageCaptured} onImageUploaded={handleImageUploaded} />;
    }
    return <WebcamCapture onImageCaptured={handleImageCaptured} onImageUploaded={handleImageUploaded} />;
  };

  return (
    <div className="w-full">
        <div className="w-full text-center py-6 relative z-20">
            <div className="absolute top-6 right-6 flex items-center gap-4">
                <button 
                    onClick={() => setIsMeasurementsModalOpen(true)}
                    className="flex items-center bg-black/40 hover:bg-black/60 border border-gray-600 hover:border-white text-white font-semibold py-2 px-4 rounded-full transition-all hover:scale-105 backdrop-blur-sm"
                >
                    <RulerIcon /> My Measurements
                </button>
                <button 
                    onClick={() => setIsLooksModalOpen(true)}
                    className="flex items-center bg-black/40 hover:bg-black/60 border border-gray-600 hover:border-white text-white font-semibold py-2 px-4 rounded-full transition-all hover:scale-105 backdrop-blur-sm"
                >
                    <CollectionIcon /> My Looks
                </button>
            </div>
        </div>
        {error && !isLoading && (
            <div className="bg-red-900/80 border border-red-500 text-white px-6 py-4 rounded-xl relative mb-6 max-w-xl mx-auto backdrop-blur-md shadow-lg animate-slide-up" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
                <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                    <span className="text-2xl">&times;</span>
                </button>
            </div>
        )}
        {renderContent()}
        <GenerateClothingModal
            isOpen={creatingItemType !== null}
            initialType={creatingItemType}
            onClose={() => setCreatingItemType(null)}
            onItemCreated={handleItemCreated}
        />
        <SavedLooksModal 
            isOpen={isLooksModalOpen}
            onClose={() => setIsLooksModalOpen(false)}
            looks={savedLooks}
            onDelete={handleDeleteLook}
        />
        <SavedMeasurementsModal
            isOpen={isMeasurementsModalOpen}
            onClose={() => setIsMeasurementsModalOpen(false)}
            measurements={savedMeasurements}
            onDelete={handleDeleteMeasurement}
        />
    </div>
  );
}

// --- Main App Component (Router) ---

const Header: React.FC<{ currentPage: Page; onNavigate: (page: Page) => void }> = ({ currentPage, onNavigate }) => {
    const navItems: { page: Page; label: string }[] = [
        { page: 'home', label: 'Home' },
        { page: 'try-on', label: 'Virtual Try-On' },
        { page: 'contact', label: 'Contact' },
    ];
    return (
        <header className="sticky top-0 z-50 w-full py-4 px-8 flex justify-between items-center border-b border-gray-800/50 bg-black/30 backdrop-blur-md">
            <div className="font-heading text-2xl font-extrabold tracking-tight text-white cursor-pointer transition-all hover:text-gray-300 hover:scale-105" onClick={() => onNavigate('home')}>
                1 of One
            </div>
            <nav className="flex items-center gap-8">
                {navItems.map(item => (
                    <button
                        key={item.page}
                        onClick={() => onNavigate(item.page)}
                        className={`font-bold uppercase tracking-widest text-xs transition-all duration-300 relative group ${
                            currentPage === item.page ? 'text-white' : 'text-gray-500 hover:text-white'
                        }`}
                    >
                        {item.label}
                        <span className={`absolute -bottom-1 left-0 h-0.5 bg-white transition-all duration-300 ${currentPage === item.page ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                    </button>
                ))}
            </nav>
        </header>
    );
};

export default function App() {
    const [currentPage, setCurrentPage] = useState<Page>('home');

    return (
        <div className="min-h-screen flex flex-col text-gray-100 font-sans">
            <Header currentPage={currentPage} onNavigate={setCurrentPage} />
            <main className="w-full flex-grow flex items-center justify-center p-4 sm:p-8">
                {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} />}
                {currentPage === 'try-on' && <TryOnStudio />}
                {currentPage === 'contact' && <ContactPage />}
            </main>
            <footer className="w-full text-center py-6 text-gray-600 text-sm font-light">
                <p>Powered by Gemini</p>
            </footer>
        </div>
    );
}