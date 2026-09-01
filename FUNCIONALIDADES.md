# Roadmap - Hub de IA Universal: Todas as Funcionalidades

## ✅ Fase 1: Infraestrutura (Concluída)
- [x] PWA com manifest.json e service worker
- [x] Banner de instalação interativo
- [x] Hooks para gerenciar SW e instalação
- [x] Meta tags para mobile (viewport, apple-touch-icon, etc)
- [x] Utilitários de Guest Mode

## 🔄 Fase 2: Acesso Sem Autenticação (Em Progresso)

### 2.1 Guest Mode Completo
**Arquivo**: `src/lib/hub-store.tsx`
- [ ] Modificar `HubProvider` para suportar guest mode
- [ ] Criar estado "guestProfile" com créditos limitados
- [ ] Implementar limites: 3 chats/dia, 2 imagens/dia
- [ ] Salvar chats/mensagens em localStorage (guest)
- [ ] Sincronizar dados guest → Supabase ao fazer login

### 2.2 AuthGate Simplificado
**Arquivo**: `src/components/hub/AuthGate.tsx`
- [ ] Adicionar botão "Continuar como Convidado" destacado
- [ ] Permitir acesso direto como guest sem forçar login
- [ ] Mostrar badge "Acesso de Convidado" na UI

### 2.3 API Guest Support
**Arquivos**: `src/routes/api/chat.ts`, `src/routes/api/images.ts`
- [ ] Aceitar requisições com deviceId + isGuest
- [ ] Validar limites de guest (3 chats/dia, 2 imagens/dia)
- [ ] Rate limit por IP para guest
- [ ] Retornar mensagem "limite atingido" + oferecer criar conta

---

## 🚀 Fase 3: Multi-Provider com Fallback

**Arquivo**: `src/lib/ai.ts`
- [ ] Implementar fallback automático:
  - Se Google Gemini falhar → tenta OpenRouter
  - Se OpenRouter falhar → tenta Groq
  - Se Groq falhar → tenta Hugging Face
- [ ] Adicionar flag no histórico: qual provider respondeu
- [ ] Mostrar provider usado em cada mensagem
- [ ] UI para seletor de provider com status de disponibilidade

---

## 💾 Fase 4: Histórico Sincronizado

**Arquivo**: `src/lib/hub-store.tsx`, banco de dados
- [ ] Migrar chats locais (guest) → Supabase ao fazer login
- [ ] Sincronizar histórico entre dispositivos:
  - Desktop ↔ Mobile
  - Web ↔ App instalado
- [ ] Última mensagem sync: ao abrir app
- [ ] Offline: cache com sync automático ao voltar online

---

## 📝 Fase 5: Prompts e Templates

**Novos componentes**:
- `src/components/PromptLibrary.tsx`
- `src/lib/prompts.ts`
- Tabela: `public.prompt_templates`

**Funcionalidades**:
- [ ] Biblioteca pública de prompts reutilizáveis
- [ ] Criar/salvar prompts personalizados
- [ ] Compartilhar prompts com comunidade
- [ ] Tags e categorias (escrita, código, criativo, etc)
- [ ] Botão "usar prompt" que pré-preenche o chat

---

## 📴 Fase 6: Modo Offline

**Arquivos**: Service Worker, `src/hooks/use-service-worker.ts`
- [ ] Cache de respostas anteriores
- [ ] Modo offline: ler histórico sem internet
- [ ] Queue de mensagens pendentes (enviadas quando voltar online)
- [ ] Indicador visual de status offline/online
- [ ] Background sync com Supabase

---

## 📎 Fase 7: Attachments Avançados

**Arquivo**: `src/components/Composer.tsx`
- [ ] Suporte a PDF (extract text + embed)
- [ ] Suporte a TXT, CSV
- [ ] OCR para imagens (Tesseract.js)
- [ ] Preview de attachment antes de enviar
- [ ] Limite de tamanho: 10MB por arquivo, 50MB por chat
- [ ] Histórico de attachments usados

---

## 🖼️ Fase 8: Gallery de Imagens Avançada

**Arquivo**: `src/components/hub/ImageStudio.tsx`
- [ ] Lazy loading + pagination (20 imagens por página)
- [ ] Filtros: data, modelo, por prompt
- [ ] Regenerar variações (mesma seed)
- [ ] Exportar: PNG, JPG, WebP, SVG
- [ ] Favoritos/Coleções
- [ ] Download automático (com nome descritivo)

---

## 📱 Fase 9: Responsividade Mobile-First

**Todos os componentes**:
- [ ] Breakpoints: xs (320px), sm (640px), md (768px), lg (1024px), xl (1280px)
- [ ] Drawer sidebar em mobile (já existe, melhorar)
- [ ] Touch-friendly inputs (44px min height)
- [ ] Swipe gestures: voltar, próximo chat
- [ ] Viewport corrigido para safe-area (notches)
- [ ] Font sizes fluidas (clamp)
- [ ] Grid responsivo para images gallery

### Checklist Mobile:
- [ ] ChatWindow: overflow-y auto em mobile, chat bubbles compactas
- [ ] ImageStudio: gallery 2 colunas (mobile) → 4 colunas (desktop)
- [ ] AdminDashboard: charts responsivos (recharts já faz)
- [ ] CreditsBar: ícones em mobile, texto em desktop
- [ ] ModelPicker: dropdown em desktop → modal em mobile
- [ ] SettingsDialog: modal responsivo

---

## 📊 Fase 10: Analytics e Monitoramento (Opcional)

**Integração** (Posthog ou Plausible):
- [ ] Track: modelo usado, provider, taxa de erro
- [ ] Análise: qual provider é mais usado/rápido
- [ ] Funnel: guest → autenticado → pagador
- [ ] Custom events: "chat created", "image generated", "error occurred"

---

## 🔒 Fase 11: Segurança e Performance

- [ ] Rate limiting robusto por IP
- [ ] Retry automático com exponential backoff
- [ ] Validação com Zod para todas as respostas
- [ ] Content Security Policy (CSP)
- [ ] Compression de imagens (sharp)
- [ ] Lazy loading de componentes (React.lazy)

---

## 📋 Prioridade de Implementação (Recomendado)

| Ordem | Fase | Impacto | Complexidade | Tempo |
|-------|------|---------|--------------|-------|
| 1 | Guest Mode (2.1-2.3) | 🔴 Crítico | Média | 3-4h |
| 2 | Responsividade (9) | 🔴 Alto | Média | 2-3h |
| 3 | Multi-Provider (3) | 🟡 Alto | Média | 2-3h |
| 4 | Histórico Sync (4) | 🟡 Média | Alta | 2-3h |
| 5 | Attachments (7) | 🟡 Média | Média | 2-3h |
| 6 | Gallery (8) | 🟢 Baixa | Baixa | 1-2h |
| 7 | Prompts (5) | 🟢 Nice-to-have | Baixa | 1-2h |
| 8 | Offline (6) | 🟢 Nice-to-have | Média | 2-3h |

**Total estimado**: 15-23 horas de desenvolvimento

---

## 🛠️ Tecnologias Adicionais (se necessário)

- `crypto-js`: Geração de UUIDs (já está tentando importar em guest-mode.ts)
- `tesseract.js`: OCR para imagens (opcional)
- `sharp`: Compressão de imagens (backend)
- `posthog` ou `plausible`: Analytics
- `qrcode.react`: QR code para compartilhar

---

## 📝 Notas

- **Guest Mode precisa ser prioritário**: sem isso, o projeto não funciona como "Google"
- **Responsividade**: revise todos os componentes com DevTools mobile
- **Service Worker**: teste offline com DevTools > Network > Offline
- **Compatibilidade**: testar em Android (Chrome), iOS (Safari), e browsers desktop
- **Lovable**: depois de cada fase importante, validar preview no Lovable

---

## Proximos Passos

1. Terminar Guest Mode (prioridade 1)
2. Implementar responsividade mobile (prioridade 2)
3. Commitar e validar em preview
4. Continuar com multi-provider

Se precisar de ajuda com qualquer fase, é só chamar! 🚀
