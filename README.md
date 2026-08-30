# AI Universal Hub

Crie uma aplicação web completa (Single Page Application) que funcione como um "Hub de IA Universal", com o foco inicial em um chatbot de texto avançado integrado à API de Inference Providers da Hugging Face.

**Tecnologias:**
- Framework: React com Vite.
- Estilização: Tailwind CSS para um design moderno, limpo e responsivo (estilo Dark Mode por padrão).
- Ícones: Lucide React.
- Gerenciamento de Estado: React Context ou Zustand (simples).
- Lógica de IA: Use a biblioteca `@huggingface/inference` ou chamadas diretas à API REST da Hugging Face (via `fetch`).

**Funcionalidades Principais (MVP - Versão 1):**

1. **Interface de Chat Moderna:**
   - Sidebar lateral para histórico de conversas (salvas localmente no `localStorage`).
   - Área central de chat com bulhas de mensagens (usar estilo similar ao ChatGPT ou GitHub Copilot).
   - Indicação de "digitando..." (streaming de tokens) para dar sensação de tempo real.
   - Área de input fixa no fundo com suporte a Enter para enviar e Shift+Enter para nova linha.
   - Botão para limpar conversa atual.

2. **Integração Hugging Face Inference Providers:**
   - Implemente um sistema de configuração onde o usuário pode inserir seu **Hugging Face Token** (armazenado localmente, nunca enviado para nenhum servidor externo além da HF).
   - **Seleção de Modelo:** Crie um seletor (dropdown) que permita escolher o modelo. Comece com a lista padrão sugerida na documentação (ex: `openai/gpt-oss-120b`, `deepseek-ai/DeepSeek-R1`, `mistralai/Mistral-7B`).
   - **Política de Seleção:** Implemente a lógica para escolher o provedor automaticamente (`:fastest`) ou permitir que o usuário escolha (`:cheapest`).
   - **Tratamento de Erros:** Se a API retornar erro 429 (Rate Limit) ou 503, mostre uma mensagem amigável ao usuário sugerindo tentar novamente mais tarde.

3. **Design e UX:**
   - Tema escuro profissional (cores: fundo quase preto, acentos em azul/gris).
   - Animações suaves ao enviar mensagens e receber respostas.
   - Responsivo: O chat deve funcionar bem em desktop e mobile (na mobile, a sidebar deve ser um menu drawer).

**Requisitos Técnicos Específicos da API:**
- Use a endpoint: `https://router.huggingface.co/v1/chat/completions`.
- Headers: `Authorization: Bearer {HF_TOKEN}` e `Content-Type: application/json`.
- Payload padrão:
  ```json
  {
    "model": "openai/gpt-oss-120b:fastest",
    "messages": [
      { "role": "user", "content": "..." }
    ]
  }

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://geilsonc.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8ba4a038-b702-40de-b369-b99abf779514).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
