# Publicação no NPM

Este guia contém os passos necessários para publicar o pacote `@js-x/result` no npm.

## Pré-requisitos

1. Você precisa ter uma conta no [npm](https://www.npmjs.com/).
2. Você precisa estar logado no npm através do terminal.

## Passos para publicação

### 1. Criar uma organização/escopo no npm

Como o seu pacote usa um escopo (`@js-x`), você precisa criar uma organização no npm primeiro:

1. Acesse [Create Organization](https://www.npmjs.com/org/create)
2. Crie uma organização com o nome `js-x`
3. Escolha o plano gratuito (permite pacotes públicos)

### 2. Fazer login no npm via terminal

```bash
npm login
```

Siga as instruções para fazer login na sua conta npm.

### 3. Publicar o pacote

Para publicar o pacote pela primeira vez:

```bash
npm publish
```

Como você já definiu `"publishConfig": { "access": "public" }` no seu `package.json`, o pacote será publicado com acesso público.

### 4. Verificar a publicação

Após a publicação, você pode verificar se o pacote está disponível:

```bash
npm view @js-x/result
```

### 5. Atualizações futuras

Para atualizar o pacote no futuro, você precisa:

1. Atualizar a versão no `package.json` (use `npm version patch|minor|major`)
2. Executar `npm publish` novamente

## Solução de problemas comuns

### Erro de autenticação

Se você receber erros de autenticação ao tentar publicar:

```bash
npm login --scope=@js-x
```

### Erro de escopo não autorizado

Se você receber um erro indicando que não tem permissão para publicar no escopo `@js-x`:

1. Verifique se você é o proprietário ou tem permissão na organização `js-x` no npm
2. Verifique se está logado com a conta correta (`npm whoami`)

### Erro 403 Forbidden

Se você receber um erro 403 ao publicar, é possível que o nome do pacote já esteja em uso. Verifique se o nome `@js-x/result` está disponível.
