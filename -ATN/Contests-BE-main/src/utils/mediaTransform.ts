// Helper function to transform questionMedia JSON to MediaData array
export const transformQuestionMedia = (questionMedia: any): any[] => {
  if (!questionMedia) return [];
  
  try {
    // If questionMedia is already an array
    if (Array.isArray(questionMedia)) {
      return questionMedia.map((media, index) => ({
        id: media.id || `media-${index}`,
        type: media.type || (media.mimetype ? 
          media.mimetype.startsWith('image/') ? 'image' :
          media.mimetype.startsWith('video/') ? 'video' :
          media.mimetype.startsWith('audio/') ? 'audio' : 'image'
        : 'image'),
        url: media.url || media.path || '',
        thumbnail: media.thumbnail || (media.type === 'video' ? media.url : undefined),
        title: media.title || media.originalname || media.filename || '',
        description: media.description || ''
      }));
    }

    // If questionMedia is a JSON string, parse it
    if (typeof questionMedia === 'string') {
      const parsed = JSON.parse(questionMedia);
      return transformQuestionMedia(parsed);
    }

    // If questionMedia is a single object, wrap in array
    if (typeof questionMedia === 'object') {
      return [{
        id: questionMedia.id || 'media-1',
        type: questionMedia.type || 'image',
        url: questionMedia.url || questionMedia.path || '',
        thumbnail: questionMedia.thumbnail || undefined,
        title: questionMedia.title || questionMedia.originalname || '',
        description: questionMedia.description || ''
      }];
    }

    return [];
  } catch (error) {
    console.error('Error transforming questionMedia:', error);
    return [];
  }
}; 