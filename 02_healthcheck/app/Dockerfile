# 캐시 친화적 구성: 의존성 정의 파일을 먼저 복사하여
# 소스 코드만 바뀌었을 때 npm install 레이어가 캐시로 재사용되게 한다.
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./

EXPOSE 3000

CMD ["node", "server.js"]
