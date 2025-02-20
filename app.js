const modelSelector = document.getElementById('model-selector');
const inputImage = document.getElementById('input-image');
const predictButton = document.getElementById('predict');
const predictionOutput = document.getElementById('prediction-output');
const imagePreview = document.getElementById('image-preview');
const previewImg = document.getElementById('preview-img');
const modelDescription = document.getElementById('model-description');
const liveVideo = document.getElementById('live-video');
const liveCanvas = document.getElementById('live-canvas');
const liveCtx = liveCanvas.getContext('2d');
const startCameraButton = document.getElementById('start-camera');
const stopCameraButton = document.getElementById('stop-camera');

// Dangerous items to warn about
const dangerousItems = ['knife', 'gun', 'weapon', 'cleaver', 'meat cleaver', 'chopper', 'assault rifle', 'assault gun'];

let currentModels = [];
const alertSound = new Audio('p/sound.mp3');
alertSound.play().catch((error) => { console.error("Error playing the sound:", error); });

// Descriptions for each model
const modelDescriptions = {
    mobilenet: 'MobileNet is a lightweight deep learning model for image classification. It is optimized for mobile devices.',
    'coco-ssd': 'Coco-SSD is a fast and accurate object detection model trained on the COCO dataset.',
    posenet: 'PoseNet detects human poses in real-time, including key points like the head, shoulders, and knees.',
    'mobilenet-coco-ssd': 'This combination applies MobileNet for classification and Coco-SSD for object detection on the same image.',
    'mobilenet-posenet': 'This combination applies MobileNet for classification and PoseNet for human pose detection.',
    'coco-ssd-posenet': 'This combination applies Coco-SSD for object detection and PoseNet for human pose detection.'
};

// Load models based on selection
async function loadModels(models) {
    predictionOutput.innerHTML = 'Loading models, please wait...';
    currentModels = [];

    try {
        for (const model of models) {
            if (model === 'mobilenet') {
                currentModels.push({ name: 'mobilenet', instance: await mobilenet.load() });
            } else if (model === 'coco-ssd') {
                currentModels.push({ name: 'coco-ssd', instance: await cocoSsd.load() });
            } else if (model === 'posenet') {
                currentModels.push({ name: 'posenet', instance: await posenet.load() });
            }
        }
        predictionOutput.innerHTML = 'Models loaded successfully.';
    } catch (error) {
        predictionOutput.innerHTML = 'Error loading models. Please try again.';
        console.error('Model loading error:', error);
    }
}

// Preview the uploaded image
inputImage.addEventListener('change', () => {
    const file = inputImage.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            previewImg.src = reader.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// Handle prediction based on the selected model(s)
predictButton.addEventListener('click', async () => {
    if (!currentModels.length) {
        predictionOutput.innerHTML = 'Please load models first!';
        return;
    }

    const file = inputImage.files[0];
    if (!file) {
        predictionOutput.innerHTML = 'Please upload an image!';
        return;
    }

    const imgElement = new Image();
    imgElement.src = URL.createObjectURL(file);

    imgElement.onload = async () => {
        const results = {};
        let outputHTML = '';
        let dangerousItemFound = false;
        let dangerousItemsDetected = [];

        try {
            // Run predictions for selected models
            for (const { name, instance } of currentModels) {
                if (name === 'mobilenet') {
                    const predictions = await instance.classify(imgElement);
                    results['MobileNet'] = predictions;

                    // Check for dangerous items in MobileNet predictions
                    const dangerousMobileNet = predictions.filter(item => {
                        return dangerousItems.some(dangerous => {
                            return item.className.toLowerCase().includes(dangerous);
                        });
                    });

                    outputHTML += `
                        <p><strong>MobileNet Predictions:</strong></p>
                        <pre>${JSON.stringify(predictions, null, 2)}</pre>
                    `;

                    if (dangerousMobileNet.length > 0) {
                        dangerousItemFound = true;
                        dangerousItemsDetected.push({ model: 'MobileNet', items: dangerousMobileNet.map(item => item.className) });
                    }
                } else if (name === 'coco-ssd') {
                    const detections = await instance.detect(imgElement);
                    results['Coco-SSD'] = detections;

                    outputHTML += `
                        <p><strong>Coco-SSD Detections:</strong></p>
                        <pre>${JSON.stringify(detections, null, 2)}</pre>
                    `;

                    // Check for dangerous items in Coco-SSD predictions
                    const dangerousCocoSSD = detections.filter(item => 
                        dangerousItems.includes(item.class.toLowerCase())
                    );

                    if (dangerousCocoSSD.length > 0) {
                        dangerousItemFound = true;
                        dangerousItemsDetected.push({ model: 'Coco-SSD', items: dangerousCocoSSD.map(item => item.class) });
                    }
                } else if (name === 'posenet') {
                    const pose = await instance.estimateSinglePose(imgElement, { flipHorizontal: false });
                    results['PoseNet'] = pose;

                    outputHTML += `
                        <p><strong>PoseNet Prediction:</strong></p>
                        <pre>${JSON.stringify(pose, null, 2)}</pre>
                    `;
                }
            }

            // Ensure the dangerous items warning is last
            if (dangerousItemFound) {
                outputHTML += '<p class="warning">Warning: Dangerous items detected!</p>';
                dangerousItemsDetected.forEach(detection => {
                    outputHTML += `<p><strong>${detection.model} detected the following dangerous items:</strong></p><ul>`;
                    detection.items.forEach(item => {
                        outputHTML += `<li>${item}</li>`;
                    });
                    outputHTML += `</ul>`;
                });
                alertSound.play(); // Play the alert sound
            } else {
                outputHTML += '<p>No dangerous items detected.</p>';
            }

            predictionOutput.innerHTML = outputHTML;
        } catch (error) {
            predictionOutput.innerHTML = 'Error during prediction. Please check the console for more details.';
            console.error('Prediction error:', error);
        }
    };
});

// Update input and load appropriate models when a new selection is made
modelSelector.addEventListener('change', async () => {
    const selectedModel = modelSelector.value;
    modelDescription.innerHTML = modelDescriptions[selectedModel];

    let modelsToLoad = [];
    if (selectedModel === 'mobilenet') modelsToLoad = ['mobilenet'];
    else if (selectedModel === 'coco-ssd') modelsToLoad = ['coco-ssd'];
    else if (selectedModel === 'posenet') modelsToLoad = ['posenet'];
    else if (selectedModel === 'mobilenet-coco-ssd') modelsToLoad = ['mobilenet', 'coco-ssd'];
    else if (selectedModel === 'mobilenet-posenet') modelsToLoad = ['mobilenet', 'posenet'];
    else if (selectedModel === 'coco-ssd-posenet') modelsToLoad = ['coco-ssd', 'posenet'];

    await loadModels(modelsToLoad);
});

// WebCam Logic
let stream;

startCameraButton.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
        });
        liveVideo.srcObject = stream;
        liveVideo.play();
        startCameraButton.disabled = true;
        stopCameraButton.disabled = false;
        startRealTimeDetection();
    } catch (err) {
        console.error('Error accessing webcam: ', err);
    }
});

stopCameraButton.addEventListener('click', () => {
    if (stream) {
        let tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }
    liveVideo.srcObject = null;
    startCameraButton.disabled = false;
    stopCameraButton.disabled = true;
});

// Start real-time detection from webcam
async function startRealTimeDetection() {
    await loadModels(['mobilenet', 'coco-ssd']); // Can add other models here

    const detectFrame = async () => {
        liveCtx.drawImage(liveVideo, 0, 0, liveCanvas.width, liveCanvas.height);
        
        const imgData = liveCanvas.toDataURL();
        const imgElement = new Image();
        imgElement.src = imgData;
        
        imgElement.onload = async () => {
            let outputHTML = '';
            let dangerousItemFound = false;
            let dangerousItemsDetected = [];

            try {
                for (const { name, instance } of currentModels) {
                    if (name === 'mobilenet') {
                        const predictions = await instance.classify(imgElement);
                        const dangerousMobileNet = predictions.filter(item => 
                            dangerousItems.some(dangerous => 
                                item.className.toLowerCase().includes(dangerous)
                            )
                        );
                        outputHTML += `
                            <p><strong>MobileNet Predictions:</strong></p>
                            <pre>${JSON.stringify(predictions, null, 2)}</pre>
                        `;
                        if (dangerousMobileNet.length > 0) {
                            dangerousItemFound = true;
                            dangerousItemsDetected.push({ model: 'MobileNet', items: dangerousMobileNet.map(item => item.className) });
                        }
                    } else if (name === 'coco-ssd') {
                        const detections = await instance.detect(imgElement);
                        outputHTML += `
                            <p><strong>Coco-SSD Detections:</strong></p>
                            <pre>${JSON.stringify(detections, null, 2)}</pre>
                        `;
                        const dangerousCocoSSD = detections.filter(item => 
                            dangerousItems.includes(item.class.toLowerCase())
                        );
                        if (dangerousCocoSSD.length > 0) {
                            dangerousItemFound = true;
                            dangerousItemsDetected.push({ model: 'Coco-SSD', items: dangerousCocoSSD.map(item => item.class) });
                        }
                    }
                }

                // Display dangerous items and their models
                if (dangerousItemFound) {
                    outputHTML += '<p class="warning">Warning: Dangerous items detected!</p>';
                    dangerousItemsDetected.forEach(detection => {
                        outputHTML += `<p><strong>${detection.model} detected the following dangerous items:</strong></p><ul>`;
                        detection.items.forEach(item => {
                            outputHTML += `<li>${item}</li>`;
                        });
                        outputHTML += `</ul>`;
                    });
                    alertSound.play();
                } else {
                    outputHTML += '<p>No dangerous items detected.</p>';
                }

                predictionOutput.innerHTML = outputHTML;
                requestAnimationFrame(detectFrame);
            } catch (error) {
                console.error('Error in live detection:', error);
            }
        };
    };

    detectFrame();
}
