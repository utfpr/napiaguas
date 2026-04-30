# Manual: Criar Usuário Administrativo

Este documento explica como criar novos usuários administrativos no sistema NAPI Águas via linha de comando.

## Visão Geral

O sistema utiliza um script CLI que permite criar usuários diretamente no banco de dados, mantendo a segurança com hash bcrypt para senhas.

---

## Uso em Ambiente de Desenvolvimento

```bash
cd apps/api
pnpm db:create-user --email="user@email.com" --password="senha123" --name="Nome" --role="admin"
```

---

## Uso em Ambiente de Produção (Docker)

### Passo 1: Acessar o Container

1. Navegue até **Containers**
2. Localize o container da **API** (ex: `napiaguas_api`)
3. Clique em **Console** ou **Exec**
4. Selecione `/bin/sh` ou `/bin/bash`

### Passo 2: Executar o Script

```bash
node dist/src/scripts/create-user.js \
  --email="user@email.com" \
  --password="senha123" \
  --name="Nome do Usuário" \
  --role="admin"
```

### Alternativa via SSH no Servidor

```bash
# Conectar ao servidor
ssh usuario@servidor

# Executar no container
docker exec -it <nome-do-container> node dist/src/scripts/create-user.js \
  --email="user@email.com" \
  --password="senha123" \
  --name="Nome" \
  --role="admin"
```

---

## Parâmetros do Script

| Parâmetro | Obrigatório | Descrição | Exemplo |
|-----------|-------------|-----------|---------|
| `--email` | Sim | Email único do usuário | `--email="joao@universidade.com"` |
| `--password` | Sim | Senha (mínimo 8 caracteres) | `--password="minhasenha123"` |
| `--name` | Sim | Nome completo do usuário | `--name="João Silva"` |
| `--role` | Não | Papel do usuário | `--role="admin"` |
| `--workgroup` | Não | Grupo de trabalho vinculado | `--workgroup="saude"` |
| `--help` | - | Exibe ajuda do comando | `--help` |

### Valores Válidos para `--role`

| Valor | Descrição |
|-------|-----------|
| `admin` | Administrador com acesso total ao sistema |
| `gt_member` | Membro de um Grupo de Trabalho específico (padrão) |

### Valores Válidos para `--workgroup`

| Valor | Descrição |
|-------|-----------|
| `agua-doce` | GT Água Doce - Subbacias e recursos hídricos |
| `saude` | GT Saúde - Indicadores de saúde dos municípios |
| `litoral` | GT Litoral - Municípios litorâneos do Paraná |
| `transportes` | GT Transportes - Rodovias estaduais e federais |

---

## Exemplos de Uso

### Criar Administrador Geral

Usuário com acesso completo a todos os GTs:

```bash
node dist/src/scripts/create-user.js \
  --email="admin@napiaguas.com" \
  --password="senhaSegura123" \
  --name="Administrador Geral" \
  --role="admin"
```

### Criar Membro do GT Água Doce

```bash
node dist/src/scripts/create-user.js \
  --email="maria@universidade.br" \
  --password="senha123" \
  --name="Maria Santos" \
  --role="gt_member" \
  --workgroup="agua-doce"
```

### Criar Membro do GT Saúde

```bash
node dist/src/scripts/create-user.js \
  --email="carlos@saude.gov.br" \
  --password="senha456" \
  --name="Carlos Oliveira" \
  --role="gt_member" \
  --workgroup="saude"
```

### Criar Membro do GT Litoral

```bash
node dist/src/scripts/create-user.js \
  --email="ana@litoral.pr.gov.br" \
  --password="litoralPR2024" \
  --name="Ana Costa" \
  --role="gt_member" \
  --workgroup="litoral"
```

### Criar Membro do GT Transportes

```bash
node dist/src/scripts/create-user.js \
  --email="pedro@der.pr.gov.br" \
  --password="transportes123" \
  --name="Pedro Ramos" \
  --role="gt_member" \
  --workgroup="transportes"
```

---

## Mensagens do Sistema

### Sucesso

```
✅ Usuário criado com sucesso!

╔════════════════════════════════════════════════════════════════╗
║                    Dados do Usuário Criado                     ║
╠════════════════════════════════════════════════════════════════╣
║  ID:        550e8400-e29b-41d4-a716-446655440000
║  Email:     maria@universidade.br
║  Nome:      Maria Santos
║  Role:      gt_member
║  Workgroup: agua-doce
╚════════════════════════════════════════════════════════════════╝
```

### Erros Comuns

**Email já cadastrado:**
```
❌ Erro: Email "maria@universidade.br" já está cadastrado
```

**Parâmetros inválidos:**
```
❌ Erros de validação:
   • --email deve ser um email válido
   • --password deve ter no mínimo 8 caracteres
   • --name é obrigatório
```

**Banco de dados não configurado:**
```
❌ Erro: DATABASE_URL não está definida
   Configure a variável de ambiente DATABASE_URL
```

---

## Requisitos

- Container da API em execução
- Variável de ambiente `DATABASE_URL` configurada
- Acesso ao console do container (ou SSH)

---

## Segurança

- Senhas são armazenadas com hash **bcrypt** (não MD5)
- Emails devem ser únicos no sistema
- Recomenda-se senhas com no mínimo 8 caracteres, incluindo letras e números

---

## Troubleshooting

### Erro "DATABASE_URL não está definida"

O container não tem acesso às variáveis de ambiente. Verifique:
1. Se o container foi iniciado corretamente
2. Se as variáveis de ambiente estão no docker-compose

### Erro de conexão com banco

```
❌ Erro ao criar usuário: Connection refused
```

Verifique:
1. Se o container do PostgreSQL está rodando
2. Se a URL do banco está correta
3. Se há conectividade de rede entre containers

### Script não encontrado

```
Error: Cannot find module 'dist/src/scripts/create-user.js'
```

O container pode estar com uma versão antiga. Faça um novo deploy da imagem.

---

## Referências

- Arquivo do script: `apps/api/src/scripts/create-user.ts`
- Schema de usuários: `apps/api/src/db/schema/admin-users.schema.ts`
- Seed padrão: `apps/api/src/db/seeds/admin-users.seed.ts`
