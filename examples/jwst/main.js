// Important: Replace VERSION with actual version during build process
// look for the line:
// script.src = 'wcslib-VERSION.js';
//


// wcslib.js wrapper functions
let wcsReady = false;
// Image scale factor (the displayed image is a crop/scaled version of the full mosaic)
// These values should be adjusted based on the actual ds9.png image dimensions
// and its relationship to the original FITS image
const IMAGE_OFFSET_X = 0;  // Pixel offset for the crop region
const IMAGE_OFFSET_Y = 0; // Pixel offset for the crop region
const IMAGE_SCALE = 1;        // Scale factor if the image was resized

function pix2sky(x, y) {
    if (!wcsReady) return null;

    const raPtr = Module._malloc(8);
    const decPtr = Module._malloc(8);

    const status = Module._pix2sky(x, y, raPtr, decPtr);

    if (status === 0) {
        const ra = Module.getValue(raPtr, 'double');
        const dec = Module.getValue(decPtr, 'double');
        Module._free(raPtr);
        Module._free(decPtr);
        return { ra, dec };
    }

    Module._free(raPtr);
    Module._free(decPtr);
    return null;
}

function sky2pix(ra, dec) {
    if (!wcsReady) return null;

    const xPtr = Module._malloc(8);
    const yPtr = Module._malloc(8);

    const status = Module._sky2pix(ra, dec, xPtr, yPtr);

    if (status === 0) {
        const x = Module.getValue(xPtr, 'double');
        const y = Module.getValue(yPtr, 'double');
        Module._free(xPtr);
        Module._free(yPtr);
        return { x, y };
    }

    Module._free(xPtr);
    Module._free(yPtr);
    return null;
}

// Convert image click position to FITS pixel coordinates
function imageToFitsPixel(imgX, imgY, imgElement) {
    const rect = imgElement.getBoundingClientRect();
    const scaleX = imgElement.naturalWidth / rect.width;
    const scaleY = imgElement.naturalHeight / rect.height;

    // Get pixel position in the displayed image
    const pixInImg = {
        x: imgX * scaleX,
        y: imgY * scaleY
    };

    // Convert to FITS coordinates (add offset for the crop region)
    // FITS uses 1-based indexing and Y increases upward
    return {
        x: IMAGE_OFFSET_X + pixInImg.x * IMAGE_SCALE,
        y: IMAGE_OFFSET_Y + (imgElement.naturalHeight - pixInImg.y) * IMAGE_SCALE
    };
}

// Parse FITS header and extract WCS values
function parseWCSHeader(headerText) {
    const wcsValues = {};
    const lines = headerText.split('\n');

    for (const line of lines) {
        // FITS header format: KEYWORD = value / comment
        const match = line.match(/^([A-Z0-9_-]+)\s*=\s*(.+?)(?:\/|$)/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();

            // Remove quotes from string values
            if (value.startsWith("'") && value.includes("'")) {
                value = value.replace(/^'(.+?)'.*$/, '$1').trim();
            } else {
                // Try to parse as number
                const numVal = parseFloat(value);
                if (!isNaN(numVal)) {
                    value = numVal;
                }
            }
            wcsValues[key] = value;
        }
    }
    return wcsValues;
}

// Update WCS Header Info table with parsed values
function updateWCSHeaderInfo(wcsValues) {
    const formatValue = (val, suffix = '') => {
        if (typeof val === 'number') {
            // Use scientific notation for very small numbers
            if (Math.abs(val) < 0.0001 && val !== 0) {
                return val.toExponential(2) + suffix;
            }
            return val.toFixed(5) + suffix;
        }
        return val || '-';
    };

    document.getElementById('wcs-crpix1').textContent = formatValue(wcsValues['CRPIX1']);
    document.getElementById('wcs-crpix2').textContent = formatValue(wcsValues['CRPIX2']);
    document.getElementById('wcs-crval1').textContent = formatValue(wcsValues['CRVAL1'], '°');
    document.getElementById('wcs-crval2').textContent = formatValue(wcsValues['CRVAL2'], '°');
    document.getElementById('wcs-ctype1').textContent = wcsValues['CTYPE1'] || '-';
    document.getElementById('wcs-ctype2').textContent = wcsValues['CTYPE2'] || '-';
    document.getElementById('wcs-cdelt1').textContent = formatValue(wcsValues['CDELT1'], '°');
    document.getElementById('wcs-cdelt2').textContent = formatValue(wcsValues['CDELT2'], '°');
}

// Initialize wcslib
async function initWCS() {
    const statusDiv = document.getElementById('status');

    try {
        // Load the wcslib.js module
        const script = document.createElement('script');
        script.src = 'wcslib-VERSION.js';

        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });

        // Wait for Module to be ready
        await new Promise((resolve) => {
            if (typeof window.Module !== 'undefined' && window.Module.calledRun) {
                resolve();
            } else {
                const checkModule = setInterval(() => {
                    if (typeof window.Module !== 'undefined' && window.Module.calledRun) {
                        clearInterval(checkModule);
                        resolve();
                    }
                }, 100);
            }
        });

        Module = window.Module;

        // Load the FITS header
        const response = await fetch('header.txt');
        const headerText = await response.text();

        // Parse header and update WCS info table
        const wcsValues = parseWCSHeader(headerText);
        updateWCSHeaderInfo(wcsValues);

        // Allocate memory and copy header string
        const headerLen = Module.lengthBytesUTF8(headerText) + 1;
        const headerPtr = Module._malloc(headerLen);
        Module.stringToUTF8(headerText, headerPtr, headerLen);

        // Initialize WCS
        const status = Module._getWcs(headerPtr);
        Module._free(headerPtr);

        if (status !== 0) {
            throw new Error(`WCS initialization failed with status: ${status}`);
        }

        wcsReady = true;
        statusDiv.className = 'status ready';
        statusDiv.textContent = '✓ wcslib.js loaded and WCS initialized successfully!';

        // Enable buttons
        document.getElementById('pix2skyBtn').disabled = false;
        document.getElementById('sky2pixBtn').disabled = false;

    } catch (error) {
        statusDiv.className = 'status error';
        statusDiv.textContent = `Error: ${error.message}`;
        console.error('WCS initialization error:', error);
    }
}

// Event handlers
document.getElementById('pix2skyBtn').addEventListener('click', () => {
    const x = parseFloat(document.getElementById('pixX').value);
    const y = parseFloat(document.getElementById('pixY').value);

    const result = pix2sky(x, y);
    if (result) {
        document.getElementById('raResult').textContent = result.ra.toFixed(10);
        document.getElementById('decResult').textContent = result.dec.toFixed(10);
    } else {
        document.getElementById('raResult').textContent = 'Error';
        document.getElementById('decResult').textContent = 'Error';
    }
});

document.getElementById('sky2pixBtn').addEventListener('click', () => {
    const ra = parseFloat(document.getElementById('raInput').value);
    const dec = parseFloat(document.getElementById('decInput').value);

    const result = sky2pix(ra, dec);
    if (result) {
        document.getElementById('xResult').textContent = result.x.toFixed(10);
        document.getElementById('yResult').textContent = result.y.toFixed(10);
    } else {
        document.getElementById('xResult').textContent = 'Error';
        document.getElementById('yResult').textContent = 'Error';
    }
});

// Image click handler
const imageContainer = document.getElementById('imageContainer');
const fitsImage = document.getElementById('fitsImage');
const crosshair = document.getElementById('crosshair');
const coordDisplay = document.getElementById('coordDisplay');
const clickResult = document.getElementById('clickResult');

imageContainer.addEventListener('mousemove', (e) => {
    if (!wcsReady) return;

    const rect = fitsImage.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Position crosshair
    crosshair.style.display = 'block';
    crosshair.style.left = x + 'px';
    crosshair.style.top = y + 'px';

    // Get FITS coordinates
    const fitsCoords = imageToFitsPixel(x, y, fitsImage);
    const skyCoords = pix2sky(fitsCoords.x, fitsCoords.y);

    if (skyCoords) {
        coordDisplay.style.display = 'block';
        coordDisplay.style.left = (x + 15) + 'px';
        coordDisplay.style.top = (y + 15) + 'px';
        coordDisplay.innerHTML = `<strong>X:</strong> ${fitsCoords.x.toFixed(1)} <strong>Y:</strong> ${fitsCoords.y.toFixed(1)}<br><strong>RA:</strong> ${skyCoords.ra.toFixed(6)}°<br><strong>Dec:</strong> ${skyCoords.dec.toFixed(6)}°`;
    }
});

imageContainer.addEventListener('mouseleave', () => {
    crosshair.style.display = 'none';
    coordDisplay.style.display = 'none';
});

imageContainer.addEventListener('click', (e) => {
    if (!wcsReady) return;

    const rect = fitsImage.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const fitsCoords = imageToFitsPixel(x, y, fitsImage);
    const skyCoords = pix2sky(fitsCoords.x, fitsCoords.y);

    if (skyCoords) {
        clickResult.style.display = 'block';
        document.getElementById('clickPixX').textContent = fitsCoords.x.toFixed(2);
        document.getElementById('clickPixY').textContent = fitsCoords.y.toFixed(2);
        document.getElementById('clickRA').textContent = skyCoords.ra.toFixed(8);
        document.getElementById('clickDec').textContent = skyCoords.dec.toFixed(8);
    }
});

// Handle image load error
fitsImage.addEventListener('error', () => {
    imageContainer.innerHTML = `
        <div style="background: var(--gray-100); padding: 40px; border-radius: 12px; text-align: center; border: 1px dashed var(--gray-300);">
            <p style="color: #92400e; font-weight: 500; margin: 0 0 8px 0;">⚠️ Image not found</p>
            <p style="color: var(--gray-500); font-size: 14px; margin: 0;">
                Please add the FITS image PNG to the examples directory.<br>
                You can export an image from DS9 or use any PNG of your FITS data.
            </p>
        </div>
    `;
});

// Initialize on page load
initWCS();
