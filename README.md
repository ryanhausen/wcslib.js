# wcslib.js

A Javascript/WASM Transpilation of WCSLIB.

## Quick Start

### Prerequisites

To build this project, you need the Emscripten SDK installed and active in your environment.

*   **Emscripten**: Follow the instructions at [Emscripten Download and Install](https://emscripten.org/docs/getting_started/downloads.html).

### Build

Once `emcc` is in your path, simply run the Makefile:

```bash
make
```

This process will:
1. Download the latest `wcslib` source code.
2. Configure and build `wcslib` using `emconfigure` and `emmake`.
3. Compile the `wrapper.c` and link it with the static library.

### Output

The build artifacts can be found in the `build/` directory. You will see:

*   `wcslib-<version>.js`
*   `wcslib-<version>.wasm`

## About wcslib

WCSLIB is a C library that implements the "World Coordinate System" (WCS) standard in FITS (Flexible Image Transport System). It provides functions for coordinate transformation between pixel coordinates and world coordinates (e.g., celestial coordinates like Right Ascension and Declination).

For more information, visit the [official WCSLIB website](https://www.atnf.csiro.au/computing/software/wcs/wcslib).

## Disclaimer

This repository is a transpilation of the original `wcslib` C library into WebAssembly to enable its use in web environments. All credit for the underlying logic and implementation of WCSLIB belongs to the original author, **Mark Calabretta**, and the Australia Telescope National Facility (ATNF).

This project is not affiliated with the official WCSLIB project.

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please feel free to open an issue or submit a pull request.
