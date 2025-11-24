FROM emscripten/emsdk:4.0.20

RUN apt-get update && apt-get install -y make

WORKDIR /app
COPY . /app

RUN make