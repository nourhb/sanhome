# GOOD version
FROM node:18

WORKDIR /app

# copy only package first
COPY package*.json ./

RUN npm ci

# THEN copy rest
COPY . .

CMD ["npm", "start"]
