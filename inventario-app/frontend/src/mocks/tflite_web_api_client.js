// src/mocks/tflite_web_api_client.js

// Función principal para cargar un modelo
export async function loadTFLiteModel() {
  console.warn('Mock loadTFLiteModel called');
  return {
    predict: (...args) => {
      console.warn('Mock predict called with', args);
      return null;
    },
    segment: (...args) => {
      console.warn('Mock segment called with', args);
      return null;
    },
    classify: (...args) => {
      console.warn('Mock classify called with', args);
      return [];
    },
    detect: (...args) => {
      console.warn('Mock detect called with', args);
      return [];
    },
  };
}

// Mock de los módulos internos de TFLite
export const ImageSegmenter = {
  segment: (...args) => {
    console.warn('Mock ImageSegmenter.segment called with', args);
    return null;
  },
};

export const ObjectDetector = {
  detect: (...args) => {
    console.warn('Mock ObjectDetector.detect called with', args);
    return [];
  },
};

export const ImageClassifier = {
  classify: (...args) => {
    console.warn('Mock ImageClassifier.classify called with', args);
    return [];
  },
};

export const BertNLClassifier = {
  classify: (...args) => {
    console.warn('Mock BertNLClassifier.classify called with', args);
    return [];
  },
};

export const BertQA = {
  predict: (...args) => {
    console.warn('Mock BertQA.predict called with', args);
    return null;
  },
};

export const NLClassifier = {
  classify: (...args) => {
    console.warn('Mock NLClassifier.classify called with', args);
    return [];
  },
};
