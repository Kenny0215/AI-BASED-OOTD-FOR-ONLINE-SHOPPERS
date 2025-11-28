export interface FriendlyError {
    title: string;
    message: string;
}

export const getFriendlyErrorMessage = (error: unknown): FriendlyError => {
    const defaultError: FriendlyError = {
        title: 'An Unexpected Error Occurred',
        message: 'Something went wrong on our end. Please try again in a few moments.'
    };

    if (!(error instanceof Error)) {
        return defaultError;
    }

    const errorMessage = error.message.toLowerCase();

    // Specific error for quota exceeded
    if (errorMessage.includes("exceeded your current quota") || errorMessage.includes("resource_exhausted")) {
        return {
            title: 'API Quota Exceeded',
            message: 'You have exceeded your request limit for the AI service. Please check your plan and billing details, or try again later.'
        };
    }

    // Specific error from geminiService
    if (errorMessage.includes("could not perform the virtual try-on")) {
        return {
            title: 'Virtual Try-On Failed',
            message: "We couldn't place the garment on the photo. This can happen with complex poses or lighting. Please try a different photo or garment."
        };
    }

    if (errorMessage.includes("could not generate")) { // Catches garment recommendation images
        return {
            title: 'Image Generation Failed',
            message: "The AI had trouble creating the images. This is sometimes temporary. Please try again."
        };
    }

    // Generic technical errors
    if (errorMessage.includes('api key')) {
        return {
            title: 'Configuration Error',
            message: 'The service is not configured correctly. Please contact support.'
        };
    }

    if (errorMessage.includes('network') || errorMessage.includes('failed to fetch')) {
        return {
            title: 'Connection Issue',
            message: 'We couldn\'t reach our AI services. Please check your internet connection and try again.'
        };
    }

    // Fallback to the service message if it doesn't match above, but still looks custom
    if (error.message.startsWith('Could not')) {
         return {
            title: 'Request Failed',
            message: error.message
         };
    }

    return defaultError;
};