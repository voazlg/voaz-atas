# VOAZ — Checkpoint Semanal

App de preenchimento de atas e dashboard de pendências.

---

## Stack
- **React + Vite** — frontend
- **Supabase** — banco de dados + autenticação
- **Vercel** — hospedagem (deploy automático via GitHub)

---

## Passo a passo para subir do zero

### 1. Criar conta Supabase
1. Acesse https://supabase.com e crie uma conta nova
2. Crie um novo projeto (anote a senha do banco)
3. Vá em **SQL Editor** e cole todo o conteúdo do arquivo `supabase/migrations/001_schema.sql`
4. Execute o SQL (botão "Run")
5. Vá em **Settings > API** e copie:
   - `Project URL` → será o `VITE_SUPABASE_URL`
   - `anon public key` → será o `VITE_SUPABASE_ANON_KEY`

### 2. Criar usuários no Supabase
1. Vá em **Authentication > Users > Add user**
2. Crie os usuários com e-mail e senha
3. Após criar, vá no **SQL Editor** e execute para cada usuário:
```sql
INSERT INTO public.usuarios (auth_id, nome, email, role)
VALUES (
  'UUID_DO_USUARIO_NO_AUTH',  -- copie da tela de Users
  'Nome da Pessoa',
  'email@voaz.com.br',
  'pm'  -- ou 'socio' para os sócios
);
```

### 3. Criar repositório GitHub
1. Crie uma conta nova em https://github.com
2. Crie um repositório novo (ex: `voaz-atas`)
3. No terminal, dentro da pasta do projeto:
```bash
git init
git add .
git commit -m "primeiro commit"
git remote add origin https://github.com/SEU_USUARIO/voaz-atas.git
git push -u origin main
```

### 4. Deploy no Vercel
1. Crie uma conta nova em https://vercel.com (pode usar o GitHub para login)
2. Clique em **"Add New Project"**
3. Importe o repositório `voaz-atas` do GitHub
4. Nas **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua anon key
5. Clique em **Deploy**
6. Pronto! O Vercel vai gerar uma URL tipo `voaz-atas.vercel.app`

### 5. Deploy automático
A partir de agora, qualquer push para o GitHub faz deploy automático no Vercel.

---

## Desenvolvimento local

```bash
# Instalar dependências
npm install

# Criar arquivo de variáveis
cp .env.example .env.local
# Editar .env.local com suas chaves do Supabase

# Rodar localmente
npm run dev
```

---

## Funcionalidades

### App de Ata
- Checkpoint Interno e Externo
- Grupos de pauta colapsáveis (base fixa + adicionar manual)
- Navegação por Tab entre campos
- Observações com histórico acumulado por data
- Copiar item entre grupos com 1 clique
- Auto-save (800ms de debounce após digitação)
- Geração de PDF no padrão VOAZ
- Resumo de pendências para copiar (WhatsApp, e-mail, etc.)

### Dashboard
- Visão de todas as obras (sócios) ou obras próprias (PMs)
- Filtros por obra, PM e status
- Itens ordenados por urgência (Atrasado → Alerta → Monitoramento → Em andamento)
- Data limite destacada em vermelho quando vencida
- Acesso direto à ata com 1 clique
