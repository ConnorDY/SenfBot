FROM node:alpine3.15@sha256:e4c1ed79355cd19e255c26caf6a46734208a41d06fff16bdeb404cc988b7668a

WORKDIR /app

# install docker (+ bash) so we can run docker within docker :O
RUN apk --update --no-cache add docker bash

# add package.json + package-lock.json
COPY package.json package-lock.json ./

# install dependencies
RUN npm ci --production

# create temp directory for images
RUN mkdir temp

# add code
COPY ./index.js ./
COPY ./src ./src/

# add faces
COPY ./faces ./faces/

# start the bot
CMD ["npm", "start"]
