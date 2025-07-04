import axios from 'axios';

const API_KEY = 'VfeWLg6Mh235IEKEloOdTE23ktMvgJaw5wWGQhsOcB9J';
const API_URL = 'https://api.us-east.speech-to-text.watson.cloud.ibm.com/instances/30835295-f1c1-45ef-bfd2-e448b128a9e4/v1/recognize';

// IBM Watson requires Basic Auth using an "apikey" username
const auth = {
  username: 'apikey',
  password: API_KEY,
};

export const analyzePronunciation = async (audioData: Uint8Array) => {
  try {
    console.log('Sending audio to Watson API...');
    console.log('Audio data length:', audioData.length);
    console.log('Audio data type:', typeof audioData);
    
    const response = await axios.post(API_URL, audioData, {
      auth,
      headers: {
        'Content-Type': 'audio/wav',
        'Accept': 'application/json',
      },
      params: {
        'model': 'en-US_BroadbandModel',
        'timestamps': true,
        'word_confidence': true,
        'profanity_filter': false,
        'smart_formatting': true,
        'speaker_labels': false,
      },
      timeout: 30000, // 30 second timeout
      maxContentLength: 50 * 1024 * 1024, // 50MB max
    });
    
    console.log('Watson API response received');
    return response.data;
  } catch (error: any) {
    console.error('Error analyzing pronunciation:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    return null;
  }
};