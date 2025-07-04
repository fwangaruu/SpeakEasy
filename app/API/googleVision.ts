import axios from 'axios';

// IMPORTANT: You need to get your own Google Cloud Vision API key.
// 1. Go to the Google Cloud Console: https://console.cloud.google.com/
// 2. Create a new project.
// 3. Enable the "Cloud Vision API".
// 4. Go to "Credentials" and create a new API key.
// 5. Replace the placeholder below with your key.
const GOOGLE_CLOUD_VISION_API_KEY = 'AIzaSyDXFP4XGP2fuAmexukcb4W_LnFisg1QMt4';

const API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`;

export const extractTextFromImage = async (base64Image: string) => {
  try {
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
            },
          ],
        },
      ],
    };

    const response = await axios.post(API_URL, requestBody);

    if (response.data.responses && response.data.responses[0].fullTextAnnotation) {
      return response.data.responses[0].fullTextAnnotation.text;
    } else {
      throw new Error('No text found in the image.');
    }
  } catch (error: any) {
    console.error('Error with Google Vision API:', error.response?.data || error.message);
    throw new Error('Failed to extract text from image.');
  }
}; 