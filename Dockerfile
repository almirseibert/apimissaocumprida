# Usa a imagem oficial do Node.js (versão 18, leve e otimizada)
FROM node:18-alpine

# Define o diretório de trabalho dentro do contentor
WORKDIR /app

# Copia apenas os ficheiros de dependências primeiro (otimiza o cache do Docker)
COPY package*.json ./

# Instala as dependências diretamente no servidor
RUN npm install

# Copia o resto do código do seu projeto (server.js, etc.) para o contentor
COPY . .

# Expõe a porta que a nossa API vai usar
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "server.js"]