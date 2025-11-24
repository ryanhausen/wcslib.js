# Makefile for building WCSLIB + wrapper into WebAssembly

# Ensure emcc is available in PATH
ifeq ($(strip $(shell command -v emcc 2>/dev/null)),)
$(error emcc not found in PATH. Install Emscripten and/or add 'emcc' to your PATH.)
endif

# EMCC  = $(EMSDK)/upstream/emscripten/emcc
# EMCONFIGURE = $(EMSDK)/upstream/emscripten/emconfigure
# EMMAKE = $(EMSDK)/upstream/emscripten/emmake

WCSLIB_DIR = wcslib
# Pick up whichever libwcs-<version>.a the build produced
WCSLIB_LIB = $(WCSLIB_DIR)/C/libwcs-*.a
WCSLIB_INC = -I $(WCSLIB_DIR)/C -I $(WCSLIB_DIR)

WRAPPER = wrapper.c
OUTDIR = build
COMPLETED_FLAG = $(OUTDIR)/.completed

# WCSLIB functions to export
EXPORTED = '["_getWcs","_pix2sky","_sky2pix","_malloc","_free"]'
# Additional runtime methods to export
EXTRA_EXPORTED = '["HEAPU8", "stringToUTF8","lengthBytesUTF8","UTF8ToString","getValue"]'

.PHONY: all clean

all: $(COMPLETED_FLAG)

# Step 0: download WCSLIB source if not present
wcslib.tar.bz2:
	curl "ftp://ftp.atnf.csiro.au/pub/software/wcslib/wcslib.tar.bz2" -o "wcslib.tar.bz2"

# Step 0.5: extract WCSLIB source
$(WCSLIB_DIR): wcslib.tar.bz2
	tar xjf wcslib.tar.bz2
	mv wcslib-* $(WCSLIB_DIR)

# Step 1: configure WCSLIB with emconfigure
$(WCSLIB_DIR)/GNUmakefile: $(WCSLIB_DIR)
	cd $(WCSLIB_DIR) && emconfigure ./configure --disable-shared

# Step 2: build WCSLIB with emmake
$(WCSLIB_LIB): $(WCSLIB_DIR)/GNUmakefile
	cd $(WCSLIB_DIR) && emmake make

# Step 3: link wrapper + libwcs into WASM
$(COMPLETED_FLAG): $(WRAPPER) $(WCSLIB_LIB)
	WCSLIB_A="$(firstword $(wildcard $(WCSLIB_LIB)))"; \
	WCSLIB_BASE="$${WCSLIB_A##*/}"; \
	WCSLIB_VER="$${WCSLIB_BASE#libwcs-}"; \
	WCSLIB_VER="$${WCSLIB_VER%.a}"; \
	echo "Linking WCSLIB version $$WCSLIB_VER ..."; \
	mkdir -p $(OUTDIR); \
	emcc -O3 $(WRAPPER) "$$WCSLIB_A" \
		$(WCSLIB_INC) \
		-o $(OUTDIR)/wcslib-$$WCSLIB_VER.js \
		-s WASM=1 \
		-s EXPORTED_FUNCTIONS=$(EXPORTED) \
		-s EXPORTED_RUNTIME_METHODS=$(EXTRA_EXPORTED); \
	rm -f $(COMPLETED_FLAG); \
	touch $(COMPLETED_FLAG)

# Cleanup
clean:
	rm -rf $(OUTDIR) $(WCSLIB_DIR)/Makefile $(WCSLIB_DIR)/*.o $(WCSLIB_DIR)/C/*.a
