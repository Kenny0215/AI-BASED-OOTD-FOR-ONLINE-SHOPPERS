
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { performVirtualTryOn, generateGarmentRecommendations, getGarmentDetails, getStyleComparison, detectGender } from '../services/geminiService';
import Spinner from './common/Spinner';
import { User, UploadCloud, Wand2, AlertTriangle, Sparkles, RefreshCw, CheckCircle, Camera, X, ScanFace, Download, ArrowRight } from 'lucide-react';
import FloatingChatBubble from './chat/FloatingChatBubble';
import { getFriendlyErrorMessage, FriendlyError } from './common/errorHandler';
import type { RecommendationItem } from '../types';

type TryOnStep = 'UPLOAD_PERSON' | 'SET_PREFERENCES' | 'GENERATING_GARMENTS' | 'CHOOSE_GARMENT' | 'SHOW_RESULT';

interface ImageState {
    preview: string;
    base64: string;
    width: number;
    height: number;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const PrimaryButton = ({ children, onClick, type = 'button', disabled = false, isLoading = false }: { children?: React.ReactNode, onClick?: (e: any) => void, type?: 'button' | 'submit', disabled?: boolean, isLoading?: boolean }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled || isLoading}
        className="inline-flex items-center justify-center px-8 py-3 bg-amber-500 text-gray-900 font-bold rounded-lg hover:bg-amber-400 focus:ring-4 focus:outline-none focus:ring-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
    >
        <div className="flex items-center justify-center gap-2">
            {isLoading ? <><Spinner /> Processing...</> : children}
        </div>
    </button>
);

interface TryOnComparisonViewProps {
    originalImage: string;
    resultImage: string | null;
}

const TryOnComparisonView = ({ originalImage, resultImage }: TryOnComparisonViewProps) => (
    <div className="grid grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
        <div className="text-center" style={{ animation: 'slideIn 0.6s ease-out' }}>
            <h4 className="text-lg font-semibold mb-3 text-gray-400">Before</h4>
            <div className="relative w-full bg-black/30 p-2 border border-white/10 rounded-xl transition-all duration-500 hover:border-white/30 hover:shadow-lg">
                <img src={originalImage} alt="Original photo" className="w-full h-auto rounded-lg" />
            </div>
        </div>
        <div className="text-center" style={{ animation: 'slideIn 0.6s ease-out 0.2s backwards' }}>
            <h4 className="text-lg font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-purple-400 animate-pulse">After</h4>
            <div className={`relative w-full p-2 border rounded-xl transition-all duration-700 ${resultImage ? 'bg-gradient-to-br from-amber-500/10 to-purple-500/10 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]' : 'bg-black/30 border-white/10'}`}>
                {resultImage && (
                    <div className="relative overflow-hidden rounded-lg">
                         <img 
                            src={`data:image/png;base64,${resultImage}`} 
                            alt="Virtual try-on result" 
                            className="w-full h-auto rounded-lg fade-in transition-transform duration-700 hover:scale-[1.02]" 
                        />
                        <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-lg"></div>
                    </div>
                )}
            </div>
        </div>
    </div>
);

const VirtualTryOn: React.FC = () => {
    const [step, setStep] = useState<TryOnStep>('UPLOAD_PERSON');
    const [personImage, setPersonImage] = useState<ImageState | null>(null);
    const [capturedImage, setCapturedImage] = useState<ImageState | null>(null);
    const [preferences, setPreferences] = useState({ style: 'Casual', colors: 'Neutral Tones', occasion: 'Weekend Outing' });
    const [recommendedGarments, setRecommendedGarments] = useState<string[]>([]);
    const [recommendedGarmentDetails, setRecommendedGarmentDetails] = useState<RecommendationItem[]>([]);
    const [selectedGarment, setSelectedGarment] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [styleComparisonText, setStyleComparisonText] = useState<string | null>(null);
    const [error, setError] = useState<FriendlyError | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
    const [gender, setGender] = useState<string | null>(null);
    const [isDetectingGender, setIsDetectingGender] = useState<boolean>(false);
    const [isTryOnLoading, setIsTryOnLoading] = useState<boolean>(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;
        if (isCameraOpen) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                .then(s => {
                    stream = s;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    console.error("Error accessing camera:", err);
                    setError({ title: 'Camera Access Denied', message: 'Could not access the camera. Please ensure you have granted permission in your browser settings and try again.' });
                    setIsCameraOpen(false);
                });
        }
    
        return () => { // Cleanup function
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCameraOpen]);

    const processGenderDetection = async (base64Image: string) => {
        setIsDetectingGender(true);
        try {
            const detectedGender = await detectGender(base64Image);
            setGender(detectedGender);
        } catch (err) {
            console.error("Gender detection failed", err);
            setGender("Female"); // Fallback
        } finally {
            setIsDetectingGender(false);
        }
    };

    const handlePersonImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            const base64 = await fileToBase64(file);
            
            const img = new Image();
            img.onload = () => {
                setPersonImage({ 
                    preview: previewUrl, 
                    base64, 
                    width: img.width, 
                    height: img.height 
                });
                // Do not auto-advance step; waiting for user confirmation
            };
            img.src = previewUrl;
            setError(null);
            
            // Trigger gender detection in background
            processGenderDetection(base64);
        }
    }, []);

    const handleCapture = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                // Flip the image horizontally for a mirror effect, which is more intuitive for selfies
                context.translate(canvas.width, 0);
                context.scale(-1, 1);
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
            const dataUrl = canvas.toDataURL('image/jpeg');
            const base64 = dataUrl.split(',')[1];
            setCapturedImage({ 
                preview: dataUrl, 
                base64,
                width: canvas.width,
                height: canvas.height
            });
        }
    }, [videoRef, canvasRef]);
    
    const handleRetake = () => {
        setCapturedImage(null);
    };

    const handleConfirmCapture = () => {
        if (capturedImage) {
            setPersonImage(capturedImage);
            setIsCameraOpen(false);
            setCapturedImage(null);
            setError(null);
            // Do not auto-advance; allow review in main view
            processGenderDetection(capturedImage.base64);
        }
    };
    
    const handleCancelCamera = () => {
        setIsCameraOpen(false);
        setCapturedImage(null);
    };

    const handleConfirmPhoto = () => {
        setStep('SET_PREFERENCES');
    };

    const handleChangePhoto = () => {
        setPersonImage(null);
        setGender(null);
    };

    const handlePreferencesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setPreferences(prev => ({ ...prev, [name]: value }));
    };

    const playSuccessSound = () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (!audioContext) {
            console.warn("Web Audio API is not supported in this browser.");
            return;
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime);

        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.5, now); 
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        oscillator.start(now);
        oscillator.stop(now + 0.4);
    };

    const playBopSound = () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (!audioContext) {
            console.warn("Web Audio API is not supported in this browser.");
            return;
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(220.00, audioContext.currentTime);

        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0.6, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        oscillator.start(now);
        oscillator.stop(now + 0.3);
    };

    const handleGetRecommendations = async (e: React.FormEvent) => {
        e.preventDefault();
        setStep('GENERATING_GARMENTS');
        setError(null);
        
        // Use detected gender or default to Female if something went wrong/still loading
        const effectiveGender = gender || "Female";

        try {
            let aspectRatio = '1:1'; // Default aspect ratio
            if (personImage && personImage.width && personImage.height) {
                const { width, height } = personImage;
                const ratio = width / height;
    
                const supportedRatios: { [key: string]: number } = {
                    '1:1': 1,
                    '4:3': 4 / 3,
                    '3:4': 3 / 4,
                    '16:9': 16 / 9,
                    '9:16': 9 / 16,
                };
    
                let closestRatioKey = '1:1';
                let minDiff = Infinity;
    
                for (const key in supportedRatios) {
                    const diff = Math.abs(ratio - supportedRatios[key]);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestRatioKey = key;
                    }
                }
                aspectRatio = closestRatioKey;
            }

            const [garments, details] = await Promise.all([
                generateGarmentRecommendations(preferences, aspectRatio, effectiveGender),
                getGarmentDetails(preferences, effectiveGender)
            ]);
            setRecommendedGarments(garments);
            setRecommendedGarmentDetails(details);
            playSuccessSound();
            setStep('CHOOSE_GARMENT');
        } catch (e) {
            setError(getFriendlyErrorMessage(e));
            setStep('SET_PREFERENCES');
        }
    };

    const handlePerformTryOn = async () => {
        if (!personImage || !selectedGarment) {
            setError({ title: 'Missing Selection', message: 'Please select a person image and a garment before trying it on.' });
            return;
        }
        setIsTryOnLoading(true);
        setError(null);
        setResultImage(null);
        setStyleComparisonText(null);

        try {
            // First, perform the try-on to get the new image
            const tryOnResult = await performVirtualTryOn({
                personImage: personImage.base64,
                garmentImage: selectedGarment,
                width: personImage.width,
                height: personImage.height
            });
            setResultImage(tryOnResult); 

            // Second, get the comparison text using the new image
            const comparisonText = await getStyleComparison(personImage.base64, tryOnResult);
            setStyleComparisonText(comparisonText);
            
            playBopSound();

            // Finally, move to the results page
            setStep('SHOW_RESULT');
        } catch (e) {
            setError(getFriendlyErrorMessage(e));
        } finally {
            setIsTryOnLoading(false);
        }
    };

    const handleStartOver = () => {
        setStep('UPLOAD_PERSON');
        setPersonImage(null);
        setRecommendedGarments([]);
        setRecommendedGarmentDetails([]);
        setSelectedGarment(null);
        setResultImage(null);
        setStyleComparisonText(null);
        setError(null);
        setIsCameraOpen(false);
        setCapturedImage(null);
        setGender(null);
        setIsTryOnLoading(false);
    };

    const handleDownloadResult = () => {
        if (resultImage) {
            const link = document.createElement('a');
            link.href = `data:image/png;base64,${resultImage}`;
            link.download = 'ootd-tryon-result.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const renderContent = () => {
        switch (step) {
            case 'UPLOAD_PERSON':
                if (isCameraOpen) {
                    return (
                        <div className="fade-in w-full max-w-lg mx-auto text-center">
                            <div className="relative w-full aspect-[3/4] bg-black rounded-lg overflow-hidden border border-white/10 mb-4">
                                {capturedImage ? (
                                    <img src={capturedImage.preview} alt="Captured photo" className="w-full h-full object-cover" />
                                ) : (
                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform -scale-x-100"></video>
                                )}
                            </div>
                            <div className="flex justify-center gap-4">
                                {capturedImage ? (
                                    <>
                                        <PrimaryButton onClick={handleConfirmCapture}>
                                            <CheckCircle size={18} /> Use Photo
                                        </PrimaryButton>
                                        <button onClick={handleRetake} className="px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
                                            <RefreshCw className="w-4 h-4" /> Retake
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <PrimaryButton onClick={handleCapture}>
                                            <Camera size={18} /> Capture Photo
                                        </PrimaryButton>
                                        <button onClick={handleCancelCamera} className="px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
                                            <X className="w-4 h-4" /> Cancel
                                        </button>
                                    </>
                                )}
                            </div>
                            <canvas ref={canvasRef} className="hidden"></canvas>
                        </div>
                    );
                }

                if (personImage) {
                    return (
                        <div className="fade-in w-full max-w-md mx-auto text-center">
                            <h3 className="text-xl font-semibold text-amber-400 mb-6">Review Your Photo</h3>
                            <div className="relative w-full aspect-[3/4] bg-black/40 rounded-xl overflow-hidden border-2 border-amber-500/50 shadow-lg mb-8">
                                <img src={personImage.preview} alt="Upload preview" className="w-full h-full object-cover" />
                                {isDetectingGender && (
                                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                         <div className="text-white flex flex-col items-center">
                                            <Spinner />
                                            <span className="mt-2 text-sm font-medium">Analyzing style...</span>
                                         </div>
                                     </div>
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button onClick={handleChangePhoto} className="px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
                                    <RefreshCw className="w-4 h-4" /> Change Photo
                                </button>
                                <PrimaryButton onClick={handleConfirmPhoto}>
                                    Confirm & Continue <ArrowRight size={18} />
                                </PrimaryButton>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="fade-in text-center w-full max-w-4xl mx-auto">
                        <div className="mb-10">
                            <h3 className="text-3xl font-bold text-amber-400 mb-3">Step 1: Provide Your Photo</h3>
                            <p className="text-gray-400 text-lg">Upload a clear, full-body photo or use your camera.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <label className="cursor-pointer group flex flex-col items-center justify-center h-64 bg-black/20 border-2 border-dashed border-gray-600 rounded-2xl hover:border-amber-500 hover:bg-amber-500/10 transition-all duration-300">
                                <UploadCloud size={64} className="text-gray-500 mb-4 group-hover:text-amber-400 transition-colors" />
                                <span className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">Upload Image</span>
                                <input type="file" accept="image/*" onChange={handlePersonImageUpload} className="hidden" />
                            </label>

                            <button onClick={() => setIsCameraOpen(true)} className="group flex flex-col items-center justify-center h-64 bg-black/20 border-2 border-dashed border-gray-600 rounded-2xl hover:border-amber-500 hover:bg-amber-500/10 transition-all duration-300">
                                <Camera size={64} className="text-gray-500 mb-4 group-hover:text-amber-400 transition-colors" />
                                <span className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">Use Camera</span>
                            </button>
                        </div>
                    </div>
                );

            case 'SET_PREFERENCES':
                return (
                    <div className="fade-in max-w-5xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                            {/* Left Column: Image Preview with Change Button */}
                            <div className="flex flex-col">
                                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-amber-500/30 shadow-2xl bg-black/40">
                                    <img src={personImage?.preview} alt="You" className="w-full h-full object-cover" />
                                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                         {gender && !isDetectingGender && (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/90 text-black text-xs font-bold rounded-full mb-2">
                                                <ScanFace size={14} />
                                                Detected: {gender} Style
                                            </div>
                                        )}
                                    </div>
                                    {isDetectingGender && (
                                         <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                             <Spinner />
                                         </div>
                                    )}
                                </div>
                                <button 
                                    onClick={handleStartOver} // Simplest way to re-upload is to go back to step 1
                                    className="mt-4 self-center text-sm text-gray-400 hover:text-white underline decoration-amber-500/50 hover:decoration-amber-500 underline-offset-4 transition-all"
                                >
                                    Change this photo
                                </button>
                            </div>

                            {/* Right Column: Preferences */}
                            <div className="flex flex-col justify-center">
                                <div className="text-left mb-8">
                                    <h3 className="text-3xl font-bold text-amber-400 mb-2">Define Your Look</h3>
                                    <p className="text-gray-300">Customize the AI's recommendations to match your specific taste and the occasion.</p>
                                </div>

                                <div className="space-y-6 bg-black/20 p-6 rounded-xl border border-white/10">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Occasion</label>
                                        <select name="occasion" value={preferences.occasion} onChange={handlePreferencesChange} className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 transition-shadow">
                                            <option>Weekend Outing</option>
                                            <option>Office / Work</option>
                                            <option>Formal Event</option>
                                            <option>Date Night</option>
                                            <option>Workout / Gym</option>
                                            <option>Beach Vacation</option>
                                            <option>Casual Hangout</option>
                                            <option>Music Festival</option>
                                            <option>Wedding Guest</option>
                                            <option>Travel</option>
                                        </select>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Style Vibe</label>
                                            <select name="style" value={preferences.style} onChange={handlePreferencesChange} className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 transition-shadow">
                                                <option>Casual</option>
                                                <option>Formal</option>
                                                <option>Streetwear</option>
                                                <option>Bohemian</option>
                                                <option>Minimalist</option>
                                                <option>Athleisure</option>
                                                <option>Vintage</option>
                                                <option>Edgy</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Colors</label>
                                            <select name="colors" value={preferences.colors} onChange={handlePreferencesChange} className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 transition-shadow">
                                                <option>Neutral Tones</option>
                                                <option>Pastels</option>
                                                <option>Earthy Tones</option>
                                                <option>Bright & Bold</option>
                                                <option>Jewel Tones</option>
                                                <option>Monochromatic</option>
                                                <option>Cool Tones</option>
                                                <option>Warm Tones</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <PrimaryButton onClick={(e: any) => handleGetRecommendations(e)}>
                                        <Wand2 size={20} /> Generate Outfits
                                    </PrimaryButton>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'GENERATING_GARMENTS':
                return (
                    <div className="text-center py-20 fade-in">
                        <div className="inline-block relative">
                            <div className="w-20 h-20 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="text-amber-400 animate-pulse" size={24} />
                            </div>
                        </div>
                        <h3 className="mt-8 text-2xl font-bold text-white">Preparing Your Recommendation Outfits</h3>
                        <p className="mt-2 text-gray-400">Our AI is curating the best looks based on your style...</p>
                    </div>
                );

            case 'CHOOSE_GARMENT':
                return (
                    <div className="fade-in">
                        <h3 className="text-2xl font-bold text-center text-amber-400 mb-8">Step 3: Choose Your Favorite Shirt</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            {recommendedGarments.map((garment, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => setSelectedGarment(garment)}
                                    className={`group cursor-pointer relative rounded-xl overflow-hidden border-2 transition-all duration-300 ${selectedGarment === garment ? 'border-amber-500 scale-105 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'border-white/10 hover:border-white/30'}`}
                                >
                                    <img src={`data:image/png;base64,${garment}`} alt={`Option ${idx + 1}`} className="w-full h-64 object-cover" />
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-10">
                                        <p className="font-bold text-white">{recommendedGarmentDetails[idx]?.itemName || `Option ${idx + 1}`}</p>
                                        <p className="text-xs text-amber-200 mt-1">{recommendedGarmentDetails[idx]?.styleCategory}</p>
                                    </div>
                                    {selectedGarment === garment && (
                                        <div className="absolute top-2 right-2 bg-amber-500 text-black p-1 rounded-full shadow-lg">
                                            <CheckCircle size={20} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                             <button onClick={handleStartOver} className="px-6 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                                Start Over
                            </button>
                            <PrimaryButton 
                                onClick={handlePerformTryOn} 
                                disabled={!selectedGarment} 
                                isLoading={isTryOnLoading}
                            >
                                <Wand2 size={20} /> Try It On
                            </PrimaryButton>
                        </div>
                    </div>
                );

            case 'SHOW_RESULT':
                return (
                    <div className="fade-in flex flex-col items-center w-full">
                        <div className="w-full mb-8">
                           {personImage && <TryOnComparisonView originalImage={personImage.preview} resultImage={resultImage} />}
                        </div>

                        {styleComparisonText && (
                            <div className="max-w-2xl mx-auto bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-8 text-center" style={{ animation: 'fadeIn 0.8s ease-out 0.5s backwards' }}>
                                <p className="text-amber-200 italic text-lg">"{styleComparisonText}"</p>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={handleStartOver} className="px-6 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                                Start Over
                            </button>
                             <PrimaryButton onClick={handleDownloadResult}>
                                <Download size={20} /> Save Result
                            </PrimaryButton>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="relative min-h-[600px] flex flex-col items-center justify-center">
            {error && (
                <div className="w-full max-w-2xl mb-6 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg flex items-start gap-3 fade-in">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold">{error.title}</h4>
                        <p className="text-sm opacity-90">{error.message}</p>
                    </div>
                </div>
            )}
            
            {renderContent()}
            <FloatingChatBubble />
        </div>
    );
};

export default VirtualTryOn;
