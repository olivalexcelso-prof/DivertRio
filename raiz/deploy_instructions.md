
# Instruções de Implantação do Bingo Master Pro Centralizado

Para rodar a aplicação com o novo backend centralizado, siga os passos abaixo:

## 1. Backend (Servidor)
Navegue até a pasta `backend` e instale as dependências:
```bash
cd backend
npm install
npm start
```
O servidor rodará na porta `3001`.

## 2. Frontend (Cliente)
Na raiz do projeto, instale as dependências e inicie o Vite:
```bash
npm install
npm run dev
```

## Mudanças Realizadas:
- **Sorteio Centralizado**: O servidor agora controla o sorteio das 90 bolas a cada 6 segundos.
- **Geração de Cartelas**: As cartelas são geradas no servidor, garantindo que todos os números de 1 a 90 sejam distribuídos corretamente entre as séries.
- **Sincronização em Tempo Real**: Todos os jogadores conectados veem a mesma bola sendo sorteada simultaneamente via WebSockets.
- **Preservação do Design**: Nenhuma alteração visual foi feita no frontend; apenas a "fiação" interna foi conectada ao novo servidor.
- **90 Bolas**: Toda a lógica foi estritamente configurada para o padrão de 90 bolas, conforme solicitado.

## Observação sobre o Render:
Ao hospedar no Render, lembre-se de:
1. Hospedar o backend como um "Web Service".
2. Atualizar a `API_URL` no arquivo `src/context/GameContext.tsx` para o endereço do seu backend no Render.
