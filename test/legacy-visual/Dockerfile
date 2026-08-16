FROM mcr.microsoft.com/playwright@sha256:baed2032d533817f3dbe6425de795788430ba345e819a1201337009ba17c9d07

WORKDIR /capture
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY capture.mjs pixel-diff.mjs manifest.json ./
ENTRYPOINT ["node", "/capture/capture.mjs"]
