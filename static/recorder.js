// High-performance browser-native Canvas recording utility

export class CanvasRecorder {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.isRecording = false;
    }

    /**
     * Start recording the canvas
     * @param {number} fps Target frames per second
     */
    start(fps = 30) {
        if (this.isRecording) return;

        this.recordedChunks = [];
        
        // Capture stream from WebGL Canvas
        // WebGL requires preserveDrawingBuffer: true, which we set in three_scene.js
        this.stream = this.canvas.captureStream(fps);
        
        // Find supported mime types (prefer VP9 or H264 for maximum compatibility)
        let options = { mimeType: 'video/webm;codecs=vp9' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm;codecs=vp8' };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm;codecs=h264' };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm' };
        }

        try {
            this.mediaRecorder = new MediaRecorder(this.stream, options);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                console.log("Recording stopped. Chunks captured:", this.recordedChunks.length);
            };

            // Collect chunks every 1 second
            this.mediaRecorder.start(1000);
            this.isRecording = true;
            console.log("Recording started using mimeType:", options.mimeType);
        } catch (error) {
            console.error("Failed to start MediaRecorder:", error);
            throw error;
        }
    }

    stop() {
        return new Promise((resolve) => {
            if (!this.isRecording || !this.mediaRecorder) {
                resolve(null);
                return;
            }

            this.mediaRecorder.onstop = () => {
                this.isRecording = false;
                // Create blob
                const blob = new Blob(this.recordedChunks, {
                    type: this.mediaRecorder.mimeType
                });
                resolve(blob);
            };

            this.mediaRecorder.stop();
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
        });
    }

    /**
     * Download recorded file to user's browser
     * @param {Blob} blob 
     * @param {string} filename 
     */
    download(blob, filename = "人俑共舞_dance.webm") {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
}
